import { ActeNaissance } from "./ActeNaissance";
import { TypePiece } from "./TypePiece";

export interface PieceJointeActeNaissance{
    id : number ; 
    chemin : string ; 
    type: TypePiece; 
    acteNaissance: ActeNaissance; 
}