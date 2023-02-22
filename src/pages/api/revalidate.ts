import { NextApiRequest, NextApiResponse } from 'next'

interface RevalidationRequest extends NextApiRequest {
  query: {
    secret: string
    'paths[]': string[]
  }
}

type RevalidationResponse = NextApiResponse<{
  error?: string
  success: boolean
}>

const handleError = (
  res: RevalidationResponse,
  status: number,
  message: string
) => {
  console.log(message)
  return res.status(status).json({ success: false, error: message })
}

const revalidate = async (
  { query }: RevalidationRequest,
  res: RevalidationResponse
) => {

  if (query.secret !== process.env.REVALIDATION_TOKEN) {
    return handleError(res, 401, 'Invalid token')
  }

  const paths = [query['paths[]']].flat()

  if (!paths[0]) {
    return handleError(res, 400, 'Bad request (no paths)')
  }

  const revalidationPromises = paths.map(async (path) => {
    try {
      await res.revalidate(path)
      console.log(`Revalidated: ${path}`)
    } catch (err) {
      console.log(err)
      return path
    }
  })

  const revalidationResult = await Promise.all(revalidationPromises)

  const failedRevalidations = revalidationResult.filter(
    (path) => path !== undefined
  )

  if (failedRevalidations.length) {
    return handleError(
      res,
      500,
      `Failed Revalidations: ${failedRevalidations.join(', ')}`
    )
  }

  return res.json({ success: true })
}

export default revalidate
