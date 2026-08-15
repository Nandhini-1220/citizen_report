from app.services.sms_service import send_real_sms

# PUT YOUR REAL 10-DIGIT MOBILE NUMBER HERE
MY_MOBILE_NUMBER = "+919042738066" 

test_message = "Citizen Helpline: Your complaint #WAT-8492 (Water Leakage) is confirmed. Assigned SLA: 4 Hours. Track: http://localhost:5173/track/WAT-8492"

print(f"Sending real SMS test to: {MY_MOBILE_NUMBER}...")
res = send_real_sms(MY_MOBILE_NUMBER, test_message)
print("Response:", res)