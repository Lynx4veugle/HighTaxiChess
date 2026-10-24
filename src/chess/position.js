import {Chess,opposite,sq} from "../../chess.js";

function hasLegalEnPassant(fen,ep){
  const parts=String(fen||'').trim().split(/\s+/);
  if(parts.length<4||ep==='-')return false;
  const side=parts[1],file='abcdefgh'.indexOf(ep[0]),rank=Number(ep[1]);
  if(!['w','b'].includes(side)||file<0||![3,6].includes(rank))return false;
  if((side==='w'&&rank!==6)||(side==='b'&&rank!==3))return false;
  try{
    const chess=new Chess(fen);
    const fromRank=side==='w'?5:4;
    if(chess.board[sq(file,fromRank-1)]!==opposite(side)+'p')return false;
    for(const dx of [-1,1]){
      const from=sq(file+dx,fromRank-1);
      if(from&&chess.board[from]===side+'p'&&chess.isLegal(from,ep))return true;
    }
  }catch{}
  return false;
}

export function positionKeyFromFen(fen){
  const parts=String(fen||'').trim().split(/\s+/);
  if(parts.length<4)return String(fen||'').trim();
  let ep=parts[3];
  if(ep!=='-'&&!hasLegalEnPassant(fen,ep))ep='-';
  return [parts[0],parts[1],parts[2],ep].join(' ');
}

export function normalizeMove(move){
  if(typeof move==='string'){
    const raw=move.trim();
    const uci=raw.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
    if(uci)return {from:uci[1].toLowerCase(),to:uci[2].toLowerCase(),promotion:uci[3]?uci[3].toLowerCase():null,san:null};
    return {from:'',to:'',promotion:null,san:raw};
  }
  return {from:String(move?.from||'').toLowerCase(),to:String(move?.to||'').toLowerCase(),promotion:move?.promotion?String(move.promotion).toLowerCase():null,san:move?.san?String(move.san):null};
}

export function sameMove(a,b){
  const x=normalizeMove(a),y=normalizeMove(b);
  return x.from===y.from&&x.to===y.to&&(x.promotion||null)===(y.promotion||null);
}
