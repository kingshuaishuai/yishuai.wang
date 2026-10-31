import { introspectToken } from '../../server/micropub/introspection';

export default {
  /** @param incoming - Chooses a test-only provider result. @returns Runtime validation, without external requests or real credentials. */
  async fetch(incoming: Request): Promise<Response> {
    let calls = 0, redirect: string | undefined;
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls += 1;
      const request = new Request(input, init);
      redirect = request.redirect;
      return new URL(incoming.url).pathname === '/redirect'
        ? new Response('', { status: 302, headers: { location: 'https://elsewhere.invalid/' } })
        : Response.json({ active: true });
    };
    try {
      const result = await introspectToken('https://identity.example/token', 'test-only-token', '') as { active: boolean };
      return Response.json({ active: result.active, calls, redirect });
    } catch (error: any) {
      return Response.json({ status: error.statusCode, calls, redirect });
    } finally { globalThis.fetch = nativeFetch; }
  },
};
