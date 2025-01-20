export function load({ url }) {
  // Access the query parameter
  const isAdmin = url.searchParams.get('admin') === 'true';

  // Return data to the page
  return {
    isAdmin,
  };
}
