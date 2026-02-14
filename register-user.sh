#!/bin/bash

# ---------- Collect input ----------
read -rp "Email: " email
read -rp "Name: " name

while true; do
  read -rsp "Password: " password
  echo

  error=""
  [[ ${#password} -lt 8 ]]              && error="at least 8 characters"
  [[ ! "$password" =~ [A-Z] ]]          && error="an uppercase letter"
  [[ ! "$password" =~ [a-z] ]]          && error="a lowercase letter"
  [[ ! "$password" =~ [0-9] ]]          && error="a number"
  [[ ! "$password" =~ [^a-zA-Z0-9] ]]   && error="a special character"

  if [[ -n "$error" ]]; then
    echo "Password must contain $error. Try again."
  else
    break
  fi
done

# ---------- Register ----------
http_code=$(curl -s -o /tmp/register_response.json -w "%{http_code}" \
  --request POST \
  --url http://localhost:8443/api/v1/auth/register-admin \
  --header 'Content-Type: application/json' \
  --data "{\"email\":\"$email\",\"name\":\"$name\",\"password\":\"$password\"}")

echo
cat /tmp/register_response.json
echo

# if [[ "$http_code" -eq 200 || "$http_code" -eq 201 ]]; then
#   echo "Registration successful! Cleaning up..."
#   rm -f /tmp/register_response.json
#   rm -- "$0"
# else
#   echo "Registration failed (HTTP $http_code)."
# fi