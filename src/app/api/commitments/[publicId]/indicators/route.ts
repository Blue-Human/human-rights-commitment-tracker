import { getIndicators } from '@/lib/indicators/data';
export async function GET(request: Request,{params}:{params:Promise<{publicId:string}>}) {
  try {
    const {publicId} = await params;
    return Response.json(await getIndicators(publicId,new URL(request.url).searchParams.get('history') === 'all'));
  } catch {
    return Response.json({error:'No se pudieron cargar los indicadores. Puedes reintentar la consulta.'},{status:503});
  }
}
