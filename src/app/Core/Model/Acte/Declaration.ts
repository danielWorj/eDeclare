import { Enfant } from "../Enfant/Enfant";
import { Etablissement } from "../Etablissement/Etablissement";
import { Hopital } from "../Etablissement/Hopital";
import { Mairie } from "../Etablissement/Mairie";
import { Parent } from "../Utilisateur/Parent";

export interface Declaration {
    id: number;
    date: string;
    hopital: Hopital;
    mairie:Mairie; 
    enfant: Enfant;
    mere: Parent;
}