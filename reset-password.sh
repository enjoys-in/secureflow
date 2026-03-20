#!/bin/bash

read -rp "Email: " email

while true; do
  read -rsp "New Password: " new_password
  echo

  error=""
  [[ ${#new_password} -lt 8 ]]              && error="at least 8 characters"
  [[ ! "$new_password" =~ [A-Z] ]]          && error="an uppercase letter"
  [[ ! "$new_password" =~ [a-z] ]]          && error="a lowercase letter"
  [[ ! "$new_password" =~ [0-9] ]]          && error="a number"
  [[ ! "$new_password" =~ [^a-zA-Z0-9] ]]   && error="a special character"

  if [[ -n "$error" ]]; then
    echo "Password must contain $error. Try again."
  else
    read -rsp "Confirm New Password: " confirm_password
    echo
    if [[ "$new_password" != "$confirm_password" ]]; then
      echo "Passwords do not match. Try again."
    else
      break
    fi
  fi
done

http_code=$(curl -s -o /tmp/reset_response.json -w "%{http_code}" \
  --request POST \
  --url http://localhost:8443/api/v1/auth/reset-password \
  --header 'Content-Type: application/json' \
  --data "{\"email\":\"$email\",\"new_password\":\"$new_password\"}")

echo
cat /tmp/reset_response.json
echo

if [[ "$http_code" -eq 200 ]]; then
  echo "Password reset successful!"
else
  echo "Password reset failed (HTTP $http_code)."
fi

rm -f /tmp/reset_response.json
