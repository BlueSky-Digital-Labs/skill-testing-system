import { refreshToken } from './auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage'

type FetchOptions = RequestInit & {
  retryOnUnauthorized?: boolean
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: FetchOptions = {},
): Promise<Response> {
  const { retryOnUnauthorized = true, headers, ...rest } = init
  const accessToken = getAccessToken()

  const response = await fetch(input, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response
  }

  const storedRefreshToken = getRefreshToken()
  if (!storedRefreshToken) {
    clearTokens()
    return response
  }

  try {
    const refreshed = await refreshToken(storedRefreshToken)
    setTokens(refreshed.access, storedRefreshToken)

    return authorizedFetch(input, {
      ...rest,
      headers: {
        ...(headers ?? {}),
        Authorization: `Bearer ${refreshed.access}`,
      },
      retryOnUnauthorized: false,
    })
  } catch {
    clearTokens()
    return response
  }
}
