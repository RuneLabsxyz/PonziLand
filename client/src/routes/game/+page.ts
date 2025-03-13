import type { PageLoad } from './$types';

const load: PageLoad = async ({ url }) => {
  // Access the query parameter
  const isAdmin = url.searchParams.get('admin') === 'true';

  // Return data to the page
  return {
    isAdmin,
  };
};
