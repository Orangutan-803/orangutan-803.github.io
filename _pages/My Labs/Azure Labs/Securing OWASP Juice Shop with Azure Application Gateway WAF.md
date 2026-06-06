---
title: "Securing OWASP Juice Shop with Azure Application Gateway WAF"
date: "2026-06-06"
thumbnail: "assets/img/thumbnail/Juicy.webp"
---

# Objective
---
>This lab simulates a real-world scenario: securing a deliberately vulnerable web app using Azure WAF, then further hardening it by moving a public-facing Azure Container Instance (ACI) into a private virtual network.
>
>Deployed the intentionally vulnerable OWASP Juice Shop on Azure Container Instances (ACI) to test and mitigate SQL injection attacks using Azure's Web Application Firewall (WAF).

# Initial Setup & Vulnerability Validation
---
> Deployed Juice Shop container via ACI (public IP by default)

<img src="https://github.com/user-attachments/assets/7033002b-75d3-4807-8c2c-73a964ca6641" />

> Verified the instance and successfully executed a SQL injection attack, gaining admin access

<img src="https://github.com/user-attachments/assets/6f635871-16f0-47bc-9c8d-5f00e0caf8a3" />
<img src="https://github.com/user-attachments/assets/3860e81f-093e-4a39-83f4-9b7a30a9cdb3" />
<img src="https://github.com/user-attachments/assets/1fe19a94-ed00-4d5f-bc6f-9225cadab54c" />

# WAF Deployment (First Attempt)
---
> Created a new Virtual Network (VNet) to isolate the container

<img src="https://github.com/user-attachments/assets/5f5ac46a-7a31-4434-ac32-fb13dcec34ac" />
  
> Deployed Azure Application Gateway with WAF policy blocking OWASP Top 10 threats

<img src="https://github.com/user-attachments/assets/29b4bd9f-bc05-4bf3-b30f-fe3349562628" />
<img src="https://github.com/user-attachments/assets/af888627-d11f-4b72-a4f0-33fea3430fa2" />

> Configured front & backend pool with Juice Shop's public IP, listener, and routing rule

<img src="https://github.com/user-attachments/assets/52d0daef-c110-4949-8855-bef4b4ab4c77" />
<img src="https://github.com/user-attachments/assets/fe02004a-e62e-483c-9373-f92dabb4dcb4" />
<img src="https://github.com/user-attachments/assets/866ad32b-6a7e-4a08-992c-8609c694b8b0" />
<img src="https://github.com/user-attachments/assets/31bbeeba-0aa2-46fd-93e3-b6f492996f62" />

> Faced 502 Bad Gateway → recreated a new backendpool during configuration by mistake - missing target IP in backend pool (fixed)

<img src="https://github.com/user-attachments/assets/316bb759-b201-4fac-b9e2-ed041952e2bf" />
<img src="https://github.com/user-attachments/assets/602c15e6-c6da-44e7-b8a3-568740fb9bb4" />
<img src="https://github.com/user-attachments/assets/a340a7f3-3f3e-4b01-96d3-c0faf023c1b3" />
<img src="https://github.com/user-attachments/assets/9e1eea87-78a7-4bea-9934-28db05fb73f8" />
<img src="https://github.com/user-attachments/assets/2bba6af6-c36d-49c1-9372-e9deee5143c6" />

> WAF defaulted to detection mode so SQL injection still passed

<img src="https://github.com/user-attachments/assets/8e893b4b-acca-4c15-99e3-8be5e29d3c62" />
<img src="https://github.com/user-attachments/assets/7ca78739-ea33-4be7-9adf-82bf22bf24e3" />
<img src="https://github.com/user-attachments/assets/f0b761ed-fd22-4841-ac35-87dbb10c6cc7" />

> Switched to prevention mode → attacks returned 403 Forbidden

<img src="https://github.com/user-attachments/assets/e9cab8d4-e55a-438c-a08f-b753b0710f18" />
<img src="https://github.com/user-attachments/assets/7cf2a3b5-a44c-45d8-9d0a-a26e59f5f7d8" />

> Enabled diagnostic settings to stream WAF logs to Log Analytics workspace for KQL queries

<img src="https://github.com/user-attachments/assets/93c9e0b4-1b7d-425f-810f-afd28324641c" />
<img src="https://github.com/user-attachments/assets/18e2af1b-ca54-496b-9854-b62ae8830a0f" />

# Moving to a Private Network (Hardening Step)
---
> The Juice Shop container remained publicly accessible behind the WAF - a security gap. 

<img alt="8 0 Container still accessible through ct IP" src="https://github.com/user-attachments/assets/1f14d141-9033-43f8-83d9-e056bffa5569" />

> Found out Azure doesn't allow moving existing ACI or Application Gateway resources to different VNets. 
<img alt="8 1 Consulting" src="https://github.com/user-attachments/assets/656eeaa0-3cd6-412a-9f59-c262e4e868fd" />
<img alt="8 4 WAF Pvnet consultation" src="https://github.com/user-attachments/assets/84594d92-8f3a-4ae8-8825-067dde5b4a36" />

> Recreated a new Juice Shop container inside a private VNet (no public exposure)
<img alt="8 3 Creating new PVent" src="https://github.com/user-attachments/assets/42c62fc6-55e9-413f-b4f6-c0060e819d34" />

> Diagnosed why I couldn't use the ACI's VNET for the new Application Gateway WAF with AI.

<img alt="8 5 VNET conflict issue" src="https://github.com/user-attachments/assets/9c5583e3-c851-437e-87a5-96e904aee9cc" />
<img alt="8 6 Consulting" src="https://github.com/user-attachments/assets/dadcfdd6-2c84-412e-8591-853b55395aec" />
<img alt="8 7 Vnet peering" src="https://github.com/user-attachments/assets/c4a05ad1-005c-4cb5-af39-f83fc11b9b87" />

> Creating new Gateway & VNet peering between the WAF's & container's VNet

<img alt="8 8 Creating WAF vnet" src="https://github.com/user-attachments/assets/673235f6-58b4-4c96-a2e9-18c1e4ee6b77" />
<img alt="8 9 Creating Frontend" src="https://github.com/user-attachments/assets/ec11fc42-4017-4530-a67c-f5fdc77a35e5" />
<img alt="8 9 1 Associating Backend" src="https://github.com/user-attachments/assets/fcf69d99-270a-4efd-8a47-1703ab92cdf8" />
<img alt="8 9 4 Peer Link" src="https://github.com/user-attachments/assets/edaf99ce-cf77-4853-b7ad-33a08d36c5fc" />
<img alt="8 9 4 1" src="https://github.com/user-attachments/assets/1a46c157-a531-42cd-81b2-ce0bcb2a5d63" />

> Fixed another 502 by redeploying ACI with the correct port (3000 instead of 80) on the container

# Final Architecture & Results
---
> Juice Shop is not publicly reachable – all traffic must go through the WAF

> SQL injection attempts are blocked (403)
<img alt="9 0 Success" src="https://github.com/user-attachments/assets/36765708-ed2f-4f31-af8a-7356de7f43e9" />

> WAF logs show detected attacks in real time

<img alt="10 1 SQL match" src="https://github.com/user-attachments/assets/38858453-987e-4c86-ac77-420ca902d6bf" />

# Key takeaway
---
>This lab demonstrates a layered security approach; first applying WAF to block OWASP Top 10 threats, then eliminating public exposure by moving the backend into a private VNet accessible only via the WAF. 
>
>Always plan network isolation upfront as moving resources between VNets in Azure requires recreation. VNet peering is the clean way to connect a private backend to a WAF. This lab accurately simulates how to secure a vulnerable web app using Azure's managed WAF.

# Tech stack
---
>Azure Container Instances, Application Gateway WAF (OWASP rules), VNet peering, Log Analytics.
