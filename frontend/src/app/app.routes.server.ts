import { RenderMode, ServerRoute } from '@angular/ssr';

export async function getPrerenderParams() {
  // For prerendering, we need to provide all possible values for the :id parameter
  // This can be replaced with actual project IDs from your database or API
  // For now, we'll use some example IDs
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    // Add more IDs as needed
  ];
}

export const serverRoutes: ServerRoute[] = [
  {
    path: 'project/similarity/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
