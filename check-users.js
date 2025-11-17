async function checkUsers() {
  try {
    const response = await fetch('https://jrmpfxfaxjzusmqdbfqh.supabase.co/rest/v1/users?select=id,email,name,role', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybXBmeGZheGp6dXNtcWRiZnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTA2NzYzOCwiZXhwIjoyMDQ0NjQzNjM4fQ.ZhFMPf0ULWNDsLpjcmSYgvMXpGglIGM6JEjwH4-jt7Y',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybXBmeGZheGp6dXNtcWRiZnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTA2NzYzOCwiZXhwIjoyMDQ0NjQzNjM4fQ.ZhFMPf0ULWNDsLpjcmSYgvMXpGglIGM6JEjwH4-jt7Y',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const users = await response.json();
      console.log('현재 등록된 사용자들:');
      console.log(JSON.stringify(users, null, 2));
    } else {
      console.error('Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

checkUsers();
