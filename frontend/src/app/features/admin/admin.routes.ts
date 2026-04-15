import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'usuarios',
    loadComponent: () => import('./usuarios/usuarios').then(m => m.UsuariosComponent),
  },
  {
    path: 'permisos',
    loadComponent: () => import('./permisos/permisos').then(m => m.PermisosComponent),
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion').then(m => m.ConfiguracionComponent),
  },
  {
    path: 'roles-staff',
    loadComponent: () => import('./roles-staff/roles-staff').then(m => m.RolesStaffComponent),
  },
  {
    path: 'instituciones',
    loadComponent: () => import('./instituciones/instituciones').then(m => m.InstitucionesComponent),
  },
  { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
];
