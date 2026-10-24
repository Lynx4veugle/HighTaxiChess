const DEFAULT_TIMEOUT=20000;
const STOP_DRAIN_TIMEOUT=5000;

export function createStockfishController({workerFactory,timeoutMs=DEFAULT_TIMEOUT,depth=16,cacheSize=64}={}){
  if(typeof workerFactory!=='function')throw new Error('workerFactory is required');
  let worker=null,readyPromise=null,readyResolve=null,readyReject=null,readyTimer=null;
  let request=null,pendingStart=null,stopTimer=null,waitingForStop=false,token=0,disposed=false,unavailable=false,workerFailureEpoch=0,lastWorkerError=null;
  const cache=new Map();

  function setCache(key,value){cache.delete(key);cache.set(key,value);while(cache.size>cacheSize)cache.delete(cache.keys().next().value);}
  function settleRejected(entry,reason){if(!entry||entry.settled)return false;entry.settled=true;entry.reject(reason instanceof Error?reason:new Error(String(reason)));return true;}
  function rejectRequest(reason){if(request){const old=request;request=null;settleRejected(old,reason);}}
  function rejectPending(reason){if(pendingStart){const next=pendingStart;pendingStart=null;settleRejected(next,reason);}}
  function clearReadyTimer(){clearTimeout(readyTimer);readyTimer=null;}
  function clearStopTimer(){clearTimeout(stopTimer);stopTimer=null;}

  function terminateWorker(instance=worker,reason=null){
    clearReadyTimer();
    if(instance&&worker!==instance)return;
    const rejectReady=readyReject;
    if(worker===instance)worker=null;
    readyPromise=null;readyResolve=null;readyReject=null;waitingForStop=false;clearStopTimer();
    try{instance?.terminate()}catch{}
    if(reason)rejectReady?.(reason);
  }

  function restartPendingAfterStopTimeout(){
    if(!worker||request||!pendingStart||!waitingForStop)return;
    const next=pendingStart;
    pendingStart=null;
    terminateWorker(worker);
    ensureReady().then(()=>{
      if(disposed||pendingStart||next.token!==token){settleRejected(next,new Error('Stale Stockfish request'));return;}
      startRequest(next);
    }).catch(error=>settleRejected(next,error));
  }

  function armStopWatchdog(){
    clearStopTimer();
    stopTimer=setTimeout(()=>{stopTimer=null;restartPendingAfterStopTimeout();},STOP_DRAIN_TIMEOUT);
  }

  function startRequest(next,expectedWorker=null){
    clearStopTimer();
    waitingForStop=false;
    const instance=worker;
    if(!instance||expectedWorker&&instance!==expectedWorker){
      settleRejected(next,new Error('Stockfish worker unavailable'));
      return false;
    }
    request=next;
    try{instance.postMessage(`position fen ${next.fen}`);instance.postMessage(`go depth ${depth}`);return true}
    catch(error){const current=request;request=null;settleRejected(current,error);return false;}
  }

  function failWorker(instance,error){
    if(worker!==instance)return;
    unavailable=true;
    workerFailureEpoch++;
    lastWorkerError=error instanceof Error?error:new Error(String(error));
    terminateWorker(instance,lastWorkerError);
    rejectRequest(lastWorkerError);
    rejectPending(lastWorkerError);
  }

  function handleLine(raw,sourceWorker){
    if(sourceWorker!==worker)return;
    const line=typeof raw==='string'?raw:raw?.line||'';
    if(line.includes('engine load error')){const error=new Error(line);failWorker(sourceWorker,error);return;}
    if(line.includes('uciok')){try{sourceWorker.postMessage('setoption name MultiPV value 1');sourceWorker.postMessage('isready')}catch(error){failWorker(sourceWorker,error);return}}
    if(line.includes('readyok')&&readyResolve){const resolve=readyResolve;readyResolve=null;readyReject=null;clearReadyTimer();resolve(sourceWorker)}
    if(line.startsWith('bestmove ')){
      if(!request){
        waitingForStop=false;
        clearStopTimer();
        if(pendingStart){const next=pendingStart;pendingStart=null;startRequest(next);}
        return;
      }
      const current=request;request=null;waitingForStop=false;clearStopTimer();
      const bestMove=line.split(/\s+/)[1]||null;
      const result={bestMove,evaluation:current.evaluation,depth:current.depth};
      if(current.token===token&&!current.settled){setCache(current.fen,result);current.settled=true;current.resolve(result);}else settleRejected(current,new Error('Stale Stockfish result'));
      if(pendingStart){const next=pendingStart;pendingStart=null;startRequest(next);}
    }
    if(request&&line.startsWith('info ')&&line.includes(' score ')){
      const mcp=line.match(/\bscore cp (-?\d+)/),mm=line.match(/\bscore mate (-?\d+)/),md=line.match(/\bdepth (\d+)/);
      if(mcp||mm)request.evaluation={cp:mcp?Number(mcp[1]):0,mate:mm?Number(mm[1]):null};
      if(md)request.depth=Number(md[1]);
    }
  }

  function ensureReady(){
    if(disposed)return Promise.reject(new Error('Stockfish controller disposed'));
    if(readyPromise)return readyPromise;
    unavailable=false;
    readyPromise=new Promise((resolve,reject)=>{
      readyResolve=resolve;readyReject=reject;
      let instance;
      try{
        instance=workerFactory();
        worker=instance;
        instance.onmessage=e=>handleLine(e.data,instance);
        instance.onerror=e=>{
          if(worker!==instance)return;
          const error=new Error(e?.message||'Stockfish worker unavailable');
          failWorker(instance,error);
        };
        clearReadyTimer();
        readyTimer=setTimeout(()=>{
          if(worker!==instance)return;
          const error=new Error('Stockfish ne répond pas');
          failWorker(instance,error);
        },timeoutMs);
        instance.postMessage('uci');
      }catch(error){clearReadyTimer();if(worker===instance)terminateWorker(instance,error);else reject(error)}
    });
    return readyPromise;
  }

  async function analyze(fen){
    const failureEpochAtStart=workerFailureEpoch;
    const key=String(fen||'').trim();
    if(!key)throw new Error('FEN manquante');
    if(cache.has(key))return cache.get(key);
    if(disposed)throw new Error('Stockfish controller disposed');
    let readyInstance=await ensureReady();
    if(workerFailureEpoch!==failureEpochAtStart){
      throw lastWorkerError||new Error('Stockfish worker unavailable');
    }
    if(disposed)throw new Error('Stockfish controller disposed');
    if(worker!==readyInstance){
      readyInstance=await ensureReady();
      if(workerFailureEpoch!==failureEpochAtStart){
        throw lastWorkerError||new Error('Stockfish worker unavailable');
      }
      if(worker!==readyInstance)throw new Error('Stockfish worker unavailable');
    }
    const myToken=++token;
    return new Promise((resolve,reject)=>{
      const next={fen:key,token:myToken,resolve,reject,settled:false,evaluation:{cp:0,mate:null},depth:0};
      if(request){
        try{worker?.postMessage('stop')}catch{}
        rejectRequest(new Error('Stale Stockfish request'));
        rejectPending(new Error('Stale Stockfish request'));
        pendingStart=next;waitingForStop=true;armStopWatchdog();return;
      }
      if(waitingForStop){
        rejectPending(new Error('Stale Stockfish request'));pendingStart=next;return;
      }
      startRequest(next,readyInstance);
    });
  }

  function cancel(){
    token++;
    const error=new Error('Stockfish request cancelled');
    rejectRequest(error);
    rejectPending(error);
    const instance=worker;
    if(instance){try{instance.postMessage('stop')}catch{}terminateWorker(instance,error);}
    else if(readyPromise){const rejectReady=readyReject;readyPromise=null;readyResolve=null;readyReject=null;clearReadyTimer();rejectReady?.(error);}
  }
  function clearCache(){cache.clear();}
  function dispose(){disposed=true;cancel();clearCache();}
  return {ensureReady,analyze,cancel,clearCache,dispose,get unavailable(){return unavailable}};
}
