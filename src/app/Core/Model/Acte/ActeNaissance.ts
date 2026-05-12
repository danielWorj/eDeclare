import { Parent } from "../User/Parent";
import { Declaration } from "./Declaration";

export interface ActeNaissance{
    id : number; 
    numeroActe:string; 
    date : string; 
    declaration : Declaration; 
    pere: Parent; 
}