export const runtime = 'nodejs'

import { writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string | null

  if (!file || !name) {
    return Response.json(
      { error: 'file and name are required' },
      { status: 400 },
    )
  }

  // Strip any path traversal — keep only the basename
  const safeName = basename(name)
  const destPath = join(homedir(), 'Desktop', safeName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(destPath, buffer)

  return Response.json({ path: destPath })
}
