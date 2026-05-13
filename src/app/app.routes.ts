import { Routes } from '@angular/router';
import { authGuard } from './Core/Guards/AuthGuard';

export const routes: Routes = [
    //LOGIN
    {
        path: '',
                loadComponent: () => import('./Features/Auth/auth/auth').then(m => m.Auth), 
    }, 
    {
        path: 'login',
                loadComponent: () => import('./Features/Auth/auth/auth').then(m => m.Auth), 
    }, 
    //ROUTES MAIRIE
     {
        path: 'mairie',
        loadComponent: () => import('./Features/Admin/Layout/layouts/layouts').then(m => m.Layouts), 
        canActivate: [authGuard],
        children: [
            //MAIRIE
            
            { 
                path: 'dashboard', 
                loadComponent: () => import('./Features/Admin/Mairie/dashboard/dashboard').then(m => m.Dashboard) 
            },
            { 
                path: 'acte-naissance', 
                loadComponent: () => import('./Features/Admin/Mairie/acte-naissance/acte-naissance').then(m => m.ActeNaissanceC) 
            }, 
            { 
                path: 'declaration', 
                loadComponent: () => import('./Features/Admin/Mairie/tele-declaration/tele-declaration').then(m => m.TeleDeclaration) 
            },
            { 
                path: 'rdv', 
                loadComponent: () => import('./Features/Admin/Mairie/rdv/rdv').then(m => m.Rdv) 
            },
             { 
                path: 'agents', 
                loadComponent: () => import('./Features/Admin/Mairie/agents/agents').then(m => m.Agents) 
            }
        ]
    }, 

    //ROUTES PARENT
     {
        path: 'parent',
        loadComponent: () => import('./Features/Admin/Layout/layouts/layouts').then(m => m.Layouts), 
        canActivate: [authGuard],
        children: [
            //MAIRIE
            
            { 
                path: 'dashboard', 
                loadComponent: () => import('./Features/Admin/Parent/dasboard/dasboard').then(m => m.Dasboard) 
            },
            { 
                path: 'acte-naissance', 
                loadComponent: () => import('./Features/Admin/Parent/acte-naissance/acte-naissance').then(m => m.ActeNaissance) 
            }, 
            { 
                path: 'declaration', 
                loadComponent: () => import('./Features/Admin/Parent/declaration/declaration').then(m => m.DeclarationC) 
            },
            { 
                path: 'rdv', 
                loadComponent: () => import('./Features/Admin/Parent/rdv-parent/rdv-parent').then(m => m.RdvParent) 
            },
             { 
                path: 'profil', 
                loadComponent: () => import('./Features/Admin/Parent/profil/profil').then(m => m.Profil) 
            }
        ]
    }, 
    //ROUTES HOPITAL 
    {
        path: 'hopital', 
        loadComponent: () => import('./Features/Portail/hopital/hopital').then(m => m.HopitalC) 

    }
];

