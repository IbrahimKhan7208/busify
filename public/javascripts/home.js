const dateInput = document.getElementById('date');

const today = new Date();
const todayDate = today.toISOString().split('T')[0];
dateInput.setAttribute('min', todayDate);

function searchBuses(event) {
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const date = document.getElementById('date').value;

  if (from === "-1" || to === "-1") {
    alert("Please select valid 'From' and 'To' locations");
    event.preventDefault(); // Prevent form submission
    return;
  }

  if (!date) {
    alert("Please select a valid date");
    event.preventDefault();
    return;
  }

  const selectedDate = new Date(date);
  if (selectedDate < today) {
    alert("You cannot select a past date");
    event.preventDefault();
    return;
  }
}

function updateOptions() {
  const fromSelect = document.getElementById('from');
  const toSelect = document.getElementById('to');

  const fromValue = fromSelect.value; 
  const toValue = toSelect.value; 

Array.from(fromSelect.options).forEach(option => {
    if (option.value === "-1" || option.value === toValue) {
        option.disabled = true;
    } else {
        option.disabled = false;
    }
});

Array.from(toSelect.options).forEach(option => {
    if (option.value === "-1" || option.value === fromValue) {
        option.disabled = true; 
    } else {
        option.disabled = false; 
    }
});
}

function toggleAnswer(e) {
    const answer = e.nextElementSibling;
    if (answer.style.display === "none" || answer.style.display === "") {
        answer.style.display = "block";
    } else {
        answer.style.display = "none";
    }
}
  