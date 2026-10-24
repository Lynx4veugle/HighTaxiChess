import {scanGameForTrainingPuzzles as defaultScanGameForTrainingPuzzles,exportTrainingPgn} from './puzzles.js';
import {mergeTrainingPuzzles,saveTrainingPuzzles,saveTrainingScanState,isTrainingGameScanned,markTrainingGameScanned} from './store.js';

export function createTrainingController({state,getGames,currentUser,analyzeFen,cancelEngineAnalysis,render,toast,onPositionChanged,scanGame=defaultScanGameForTrainingPuzzles}){
  let abortController=null;

  function active(){return !!abortController;}
  function stop(){if(!abortController)return;abortController.abort();cancelEngineAnalysis?.("Analyse d’entraînement arrêtée.");}

  async function scan({force=false}={}){
    if(abortController)return;
    const games=getGames();
    if(!games.length){toast('Aucune partie de HighTaxi à analyser');return;}
    const user=currentUser();
    const targets=force?games:games.filter(game=>!isTrainingGameScanned(state.trainingScanState,game,user));
    if(!targets.length){toast('Training déjà à jour · aucune nouvelle partie à analyser');return;}
    abortController=new AbortController();
    const signal=abortController.signal;
    const progress=document.getElementById('trainingProgress'),scanButton=document.getElementById('trainingScanBtn'),stopButton=document.getElementById('trainingStopBtn');
    if(scanButton)scanButton.disabled=true;
    if(stopButton){stopButton.hidden=false;stopButton.disabled=false;}
    if(progress){progress.hidden=false;progress.textContent=`Analyse 0 / ${targets.length} partie(s)…`;}
    cancelEngineAnalysis('Analyse Stockfish réservée au scan d’entraînement…');
    state.trainingScanActive=true;
    let completed=0,failed=0,foundTotal=0;
    try{
      for(let i=0;i<targets.length;i++){
        const game=targets[i];
        if(signal.aborted)break;
        try{
          const puzzles=await scanGame(game,user,analyzeFen,{signal,onProgress:info=>{
            if(progress)progress.textContent=`Analyse ${i+1} / ${targets.length} · ${info.processed}/${info.total} coups · ${foundTotal+info.puzzles} puzzle(s)…`;
          }});
          foundTotal+=puzzles.length;
          state.trainingPuzzles=mergeTrainingPuzzles(state.trainingPuzzles,puzzles);
          if(!saveTrainingPuzzles(state.trainingPuzzles)){
            toast("Puzzles Training non sauvegardés : la partie n’est pas marquée comme analysée.");
            continue;
          }
          markTrainingGameScanned(state.trainingScanState,game,user,'analyzed');
          if(!saveTrainingScanState(state.trainingScanState)){
            toast('État de scan Training non sauvegardé : cette partie pourra être rescannée.');
          }
          completed++;
          render();
        }catch(error){
          if(Array.isArray(error?.puzzles)&&error.puzzles.length){
            foundTotal+=error.puzzles.length;
            state.trainingPuzzles=mergeTrainingPuzzles(state.trainingPuzzles,error.puzzles);
            if(!saveTrainingPuzzles(state.trainingPuzzles))toast('Puzzle Training partiel non sauvegardé.');
            render();
          }
          if(error?.name==='AbortError'||signal.aborted||error?.message==='Stockfish request cancelled')throw error;
          failed++;
          toast(`Analyse ignorée pour ${game.white||'?'} — ${game.black||'?'} : ${error?.message||error}`);
        }
      }
      if(!saveTrainingPuzzles(state.trainingPuzzles))toast('Puzzles Training non sauvegardés.');
      if(!saveTrainingScanState(state.trainingScanState))toast('État de scan Training non sauvegardé.');
      const message=signal.aborted
        ?`Scan arrêté · ${state.trainingPuzzles.length} position(s) Training conservée(s)`
        :`Scan terminé · ${completed}/${targets.length} partie(s) analysée(s) · ${state.trainingPuzzles.length} position(s) Training · ${failed} erreur(s)`;
      toast(message);
    }catch(error){
      if(!(error?.name==='AbortError'||signal.aborted||error?.message==='Stockfish request cancelled')){
        toast('Analyse d’entraînement impossible : '+(error?.message||error));
      }else{
        toast(`Scan arrêté · ${state.trainingPuzzles.length} position(s) conservée(s)`);
      }
    }finally{
      abortController=null;
      state.trainingScanActive=false;
      if(progress){progress.hidden=true;progress.textContent='';}
      if(scanButton)scanButton.disabled=false;
      if(stopButton){stopButton.hidden=true;stopButton.disabled=false;}
      render();
      if(document.body.classList.contains('analysisActive'))onPositionChanged?.();
    }
  }

  function exportFile(){
    const puzzles=Array.isArray(state.trainingPuzzles)?state.trainingPuzzles:[];
    if(!puzzles.length){toast('Aucun puzzle à exporter');return;}
    const out=exportTrainingPgn(puzzles),blob=new Blob([out],{type:'application/x-chess-pgn'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`HighTaxi_Training_${new Date().toISOString().slice(0,10)}.pgn`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast(`${puzzles.length} puzzle(s) exporté(s)`);
  }

  function clear(){
    if(!state.trainingPuzzles?.length&&!Object.keys(state.trainingScanState||{}).length)return;
    if(!confirm('Effacer les puzzles d’entraînement générés et leur état de scan ?'))return;
    state.trainingPuzzles=[];
    state.trainingScanState={};
    const ok=saveTrainingPuzzles(state.trainingPuzzles)&&saveTrainingScanState(state.trainingScanState);
    if(!ok)toast('Effacement Training non sauvegardé');
    render();
    toast('Puzzles et état de scan Training effacés · la progression reste conservée');
  }

  return {active,scan,stop,exportFile,clear};
}
