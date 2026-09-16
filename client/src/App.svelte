<script>
  import { onMount } from 'svelte';
  import Shell from './pages/Shell.svelte';

  const parseRoute = () => {
    const raw = (window.location.hash || '#/home').replace(/^#\//, '');
    const [pathPart, queryPart] = raw.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
    return { page: parts[0] || 'home', id: parts[1] || null, query };
  };

  let route = $state(parseRoute());

  onMount(() => {
    const onChange = () => (route = parseRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  });
</script>

<Shell {route} />
