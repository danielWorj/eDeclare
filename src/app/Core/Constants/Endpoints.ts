//const baseUrl = 'http://localhost:8080/eDeclare/api';

const baseUrl = 'https://edeclarebackend.onrender.com/eDeclare/api'; 

const authBaseUrl = `${baseUrl}/auth`;
const etablissementBaseUrl = `${baseUrl}/domaine`;
const acteBaseUrl = `${baseUrl}/declaration`;
const userBaseUrl = `${baseUrl}/user`;
const permisBaseUrl = `${baseUrl}/permis`;

export const eHAllSystemEndPoints ={
    Ping:{
        pong : `${authBaseUrl}/ping`
    }, 
    Auth : {
        login : `${authBaseUrl}/login`
    }, 
    structure : {
        Mairie : {
            all: `${etablissementBaseUrl}/mairie/all`,
            byid: `${etablissementBaseUrl}/mairie/byId/`,
            create: `${etablissementBaseUrl}/mairie/create`,
            update: `${etablissementBaseUrl}/mairie/update`,
            delete: `${etablissementBaseUrl}/mairie/delete/`,
        }, 
        Hopital : {
            all: `${etablissementBaseUrl}/hopital/all`,
            byid: `${etablissementBaseUrl}/hopital/byId/`,
            create: `${etablissementBaseUrl}/hopital/create`,
            update: `${etablissementBaseUrl}/hopital/update`,
            delete: `${etablissementBaseUrl}/hopital/delete/`,
        }


    }, 
    Acte : {
        Declaration : {
            all : `${acteBaseUrl}/all`,
            allHopital : `${acteBaseUrl}/all/byhopital/`,
            allParent : `${acteBaseUrl}/all/byparent/`,
            allMairie : `${acteBaseUrl}/all/bymairie/`,
            declare : `${acteBaseUrl}/create`,
            update : `${acteBaseUrl}/update`,
            delete : `${acteBaseUrl}/delete/`,
            PieceJointe:{
                allbydeclaration: `${acteBaseUrl}/pieces/`
            }
        }, 
        ActeNaissance :{
            allMairie : `${acteBaseUrl}/acte/all/bymairie/`,
            declare : `${acteBaseUrl}/acte/create`, 
            update : `${acteBaseUrl}/acte/update`, 
            delete : `${acteBaseUrl}/acte/delete`, 
            download : `${acteBaseUrl}/acte/download/`
        }
    }, 

    Utilisateur:{
        Sexe : {
            all : `${userBaseUrl}/sexe/all`
        },
        Parent :{
            all : `${userBaseUrl}/parent/all`,
            byId : `${userBaseUrl}/parent/byId/`,
        }, 
        Agent :{
            all : `${userBaseUrl}/agent/all`,
            allbystructure : `${userBaseUrl}/agent/all/bystructure/`,
            create : `${userBaseUrl}/agent/create`,
            update : `${userBaseUrl}/agent/update`,
            delete : `${userBaseUrl}/agent/delete/`
        }
    }

}