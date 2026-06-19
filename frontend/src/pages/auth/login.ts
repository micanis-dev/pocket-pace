import { buildAuthorizeUrl, createPkceChallenge, createPkceVerifier, setPkceRequest } from '../../lib/auth';
import { hasAuth0Config } from '../../lib/config';

export async function GET({ cookies, url, redirect }: any) {
  if (!hasAuth0Config()) {
    return redirect('/login?auth=missing');
  }

  const returnTo = url.searchParams.get('returnTo') ?? '/';
  const state = crypto.randomUUID();
  const codeVerifier = createPkceVerifier();
  const codeChallenge = await createPkceChallenge(codeVerifier);

  setPkceRequest(cookies, { state, codeVerifier, returnTo });

  return redirect(
    buildAuthorizeUrl({
      state,
      codeChallenge,
      returnTo,
    }),
  );
}
