import assert from 'node:assert/strict';
import {renderBoardSquares} from './src/ui/board.js';

class ClassList{constructor(){this.items=new Set()}add(...xs){xs.forEach(x=>this.items.add(x))}}
class Cell{
  constructor(){this.classList=new ClassList();this.dataset={};this.children=[];this.className='';this.replaceCount=0}
  replaceChildren(){this.replaceCount++;this.children=[]}
  insertAdjacentHTML(_,html){this.children.push({html})}
  appendChild(x){this.children.push(x);return x}
}
class Board{
  constructor(cells=[]){this.cells=cells}
  querySelectorAll(selector){return selector==='.square'?this.cells:[]}
  appendChild(cell){this.cells.push(cell);return cell}
}
globalThis.document={createElement:()=>new Cell()};
const board=new Board();
const chess={board:{},legalMoves:()=>[]};
let pieceCalls=0;
const base={board,chess,currentNode:{annotations:[],note:''},selectedSquare:null,lastMove:null,files:['a','b','c','d','e','f','g','h'],ranks:[8,7,6,5,4,3,2,1],pieceSVG:()=>{pieceCalls++;return ''},annotationDef:()=>({kind:'neutral',icon:'?'}),installPieceFallbacks:()=>{}};
renderBoardSquares(base);
const first=[...board.cells];
assert.equal(first.length,64);
renderBoardSquares(base);
assert.equal(board.cells.length,64);
assert.deepEqual(board.cells,first);
console.log('BOARD DOM REUSE PERFORMANCE TEST OK');
