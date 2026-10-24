export function createWriteQueue(write){
  if(typeof write!=='function')throw new Error('Write queue requires a function');
  let tail=Promise.resolve();
  function enqueue(value){
    const next=tail.then(()=>write(value),()=>write(value));
    tail=next.catch(()=>{});
    return next;
  }
  function flush(){return tail;}
  return {enqueue,flush};
}
