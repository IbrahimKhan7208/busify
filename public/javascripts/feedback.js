const feedbackButtons = document.querySelectorAll('.give-feedback-btn');
const feedbackModal = document.getElementById('feedbackModal');
const busIdInput = document.getElementById('busIdInput');
const closeBtn = document.querySelector('.close-btn');

feedbackButtons.forEach((button) => {
    button.addEventListener('click', () => {
    const busId = button.getAttribute('data-bus-id');
    busIdInput.value = busId; // Set busId in the hidden input
    feedbackModal.style.display = 'block'; // Show the modal
    });
});

closeBtn.addEventListener('click', () => {
    feedbackModal.style.display = 'none'; // Hide the modal
});

window.addEventListener('click', (event) => {
    if (event.target === feedbackModal) {
    feedbackModal.style.display = 'none'; // Close modal if clicked outside
    }
});
