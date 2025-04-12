function updateOptions() {
const fromSelect = document.getElementById('source');
const toSelect = document.getElementById('destination');

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