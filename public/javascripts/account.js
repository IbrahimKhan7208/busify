function signOut() {
  document.querySelector('.sign-out-button').addEventListener('click', function(event) {
    event.preventDefault();
    const userConfirmed = window.confirm('Are you sure you want to sign out?');
    if (userConfirmed) {
      window.location.href = '/logout';
    } 
  });
}

  