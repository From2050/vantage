import { listSkills } from '@/lib/db/skills';

export async function GET() {
  return Response.json(listSkills());
}
