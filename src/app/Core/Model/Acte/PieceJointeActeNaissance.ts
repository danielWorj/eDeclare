import { ActeNaissance } from "../../../Features/Admin/Super/acte-naissance/acte-naissance";
import { TypePiece } from "./TypePiece";

export interface PieceJointeActeNaissance{
    id : number ; 
    chemin : string ; 
    type: TypePiece; 
    acteNaissance: ActeNaissance; 
}