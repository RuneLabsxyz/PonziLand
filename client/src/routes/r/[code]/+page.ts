export async function load({ params }: { params: { code: string } }) {
  return {
    code: params.code,
  };
}
