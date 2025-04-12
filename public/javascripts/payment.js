document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ JavaScript Loaded!");

    const payButton = document.getElementById('pay-button');
    if (!payButton) {
        console.error("❌ Pay button not found!");
        return;
    }

    console.log("✅ Pay Button Found!");

    payButton.addEventListener('click', async function () {
        console.log("✅ Proceed to Payment button clicked!");

        const formData = new FormData(document.getElementById('bookingForm'));
        const formObject = Object.fromEntries(formData);
        console.log("🔹 Data being sent to backend:", formObject);

        if (!formObject.busId || !formObject.seats || !formObject.fare) {
            console.error("❌ Missing booking details:", formObject);
            alert("Error: Missing required booking details.");
            return;
        }

        try {
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData)
            });

            const data = await response.json();
            if (data.url) {
                console.log("✅ Redirecting to:", data.url);
                window.location.href = data.url; // Redirect to Stripe Checkout
            } else {
                console.error("❌ Payment Error:", data.error);
                alert("Payment failed. Please try again.");
            }
        } catch (error) {
            console.error('❌ Fetch Error:', error);
        }
    });
});
