export function renderBoardSquares({board,chess,currentNode,selectedSquare,lastMove,files,ranks,pieceSVG,annotationDef,installPieceFallbacks,annotations=currentNode?.annotations||[]}){
  const legal=new Set(selectedSquare?chess.legalMoves(selectedSquare).map(m=>m.to):[]);
  const cells=[...board.querySelectorAll?.('.square')||[]];
  while(cells.length<64){const cell=document.createElement('div');cell.className='square';board.appendChild(cell);cells.push(cell);}
  let changed=false;
  const lastFrom=lastMove?.[0]||'',lastTo=lastMove?.[1]||'',annotationKey=annotations.join('\u001f'),noteValue=String(currentNode?.note||'').trim();
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const file=files[col],rank=ranks[row],square=file+rank,x='abcdefgh'.indexOf(file),y=Number(rank)-1;
    const cell=cells[row*8+col],piece=chess.board[square]||'',isSelected=square===selectedSquare,isLast=square===lastFrom||square===lastTo,isLegal=legal.has(square),hasCapture=isLegal&&!!chess.board[square],hasAnnotation=annotations.length&&currentNode?.move&&currentNode.move.to===square,hasNote=!!noteValue&&currentNode?.move?.to===square;
    const renderKey=`${square}|${piece}|${isSelected?'1':'0'}|${isLast?'1':'0'}|${isLegal?'1':'0'}|${hasCapture?'1':'0'}|${hasAnnotation?annotationKey:''}|${hasNote?noteValue:''}|${row===7?'f':''}|${col===0?'r':''}`;
    const nextClass=`square ${((x+y)%2===0)?'dark':'light'}${isSelected?' selected':''}${isLast?' last':''}${isLegal?(hasCapture?' capture':' legal'):''}`;
    if(cell.dataset.renderKey===renderKey&&cell.className===nextClass)continue;
    changed=true;cell.className=nextClass;cell.dataset.square=square;cell.dataset.renderKey=renderKey;cell.replaceChildren();
    if(piece)cell.insertAdjacentHTML('beforeend',pieceSVG(piece)) ;
    if(hasAnnotation){const badge=document.createElement('span');const def=annotationDef(annotations.at(-1));badge.className=`squareAnnotation ${def.kind}`;badge.dataset.annotation=def.icon;badge.textContent=def.icon;badge.title=annotations.join(' ');cell.appendChild(badge);}
    if(hasNote){const note=document.createElement('span');note.className='squareNote';note.textContent='✎';note.title=noteValue;cell.appendChild(note);}
    if(row===7){const coord=document.createElement('span');coord.className='coord file';coord.textContent=file;cell.appendChild(coord);}
    if(col===0){const coord=document.createElement('span');coord.className='coord rank';coord.textContent=rank;cell.appendChild(coord);}
  }
  if(changed)installPieceFallbacks?.(board);
}

export function createBoardRenderer({board,renderSquares}){
  if(!board||typeof renderSquares!=='function')throw new Error('Board renderer requires board and renderSquares');
  function render(state){renderSquares(state);return board;}
  return {render};
}
