import { Enfant } from "../Enfant/Enfant";
import { Hopital } from "../Etablissement/Hopital";
import { Mairie } from "../Etablissement/Mairie";
import { Parent } from "../User/Parent";

export interface Declaration {
    id: number;
    date: string;
    hopital: Hopital;
    mairie:Mairie; 
    enfant: Enfant;
    mere: Parent;
}