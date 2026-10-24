import {Chess} from "../../chess.js";
import {parsePGN} from "../../pgn.js";

const DEFAULT_MAX_NODES=100000;

function assertObject(value,message){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(message);
}

export function validateAnalysisTree(tree,{maxNodes=DEFAULT_MAX_NODES}={}){
  assertObject(tree,"Arbre d’analyse invalide");
  let count=0;

  function visit(node,parentFen=null,isRoot=false){
    count++;
    if(count>maxNodes)throw new Error("Arbre d’analyse trop volumineux");
    assertObject(node,"Nœud d’analyse invalide");
    if(typeof node.fen!=="string"||!node.fen.trim())throw new Error("FEN d’analyse manquant");
    const current=new Chess(node.fen);

    if(isRoot){
      if(node.move!==null&&node.move!==undefined)throw new Error("Racine d’analyse avec un coup invalide");
    }else{
      assertObject(node.move,"Coup d’analyse invalide");
      if(typeof node.move.from!=="string"||typeof node.move.to!=="string")throw new Error("Coup d’analyse incomplet");
      const parentChess=new Chess(parentFen);
      const played=parentChess.play({
        from:node.move.from,
        to:node.move.to,
        promotion:node.move.promotion||null
      });
      if(played.fen!==node.fen)throw new Error("FEN d’analyse incohérent avec le coup parent");
      if(node.san&&String(node.san)!==played.san)throw new Error("SAN d’analyse incohérent");
    }

    if(!Array.isArray(node.children))throw new Error("Enfants d’analyse invalides");
    for(const child of node.children)visit(child,node.fen,false);
    return current.fen;
  }

  visit(tree,null,true);
  return true;
}

export function validateStoredGame(game,{maxNodes=DEFAULT_MAX_NODES}={}){
  assertObject(game,"Partie sauvegardée invalide");
  if(!String(game.id||"").trim())throw new Error("Identifiant de partie manquant");
  if(typeof game.pgn!=="string"||!game.pgn.trim())throw new Error("PGN de partie manquant");

  const parsedGames=parsePGN(game.pgn);
  if(!Array.isArray(parsedGames)||!parsedGames.length||parsedGames.errors?.length){
    const message=parsedGames?.errors?.[0]?.error||"PGN invalide";
    throw new Error(message);
  }
  if(parsedGames.length!==1)throw new Error("Une entrée de base doit contenir une seule partie");
  const parsed=parsedGames[0];
  const startFen=String(parsed.startFen||Chess.START_FEN);

  if(game.analysisTree!==null&&game.analysisTree!==undefined){
    validateAnalysisTree(game.analysisTree,{maxNodes});
    if(String(game.analysisTree.fen)!==startFen)throw new Error("Racine d’analyse différente de la position PGN");
  }
  return true;
}

export function validateStoredGames(games,options={}){
  if(!Array.isArray(games))throw new Error("Base de parties invalide");
  games.forEach((game,index)=>{
    try{validateStoredGame(game,options)}
    catch(error){throw new Error(`Partie ${index+1} invalide : ${error?.message||error}`)}
  });
  return true;
}
