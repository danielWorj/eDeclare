import { Declaration } from "./Declaration";
import { TypePiece } from "./TypePiece";

export interface PieceJointeDeclaration{
    id : number; 
    chemin : string ; 
    type : TypePiece; 
    declaration : Declaration; 
}