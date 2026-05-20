import { Enfant } from "../Enfant/Enfant";
import { Hopital } from "../Etablissement/Hopital";
import { Mairie } from "../Etablissement/Mairie";
import { Parent } from "../User/Parent";
import { PieceJointeDeclaration } from "./PieceJointeDeclaration";

export interface Declaration {
    id: number;
    date: string;
    hopital: Hopital;
    mairie:Mairie; 
    enfant: Enfant;
    mere: Parent;
}

export interface DeclarationPiece{
    declaration : Declaration; 
    pieces : PieceJointeDeclaration[]; 
}