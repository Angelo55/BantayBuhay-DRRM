# EC2 hardening guide

Step-by-step setup for the deployment host. **None of this has been run.** The commands assume Ubuntu 24.04 LTS, so adapt them if your instance runs something else. Run them on the EC2 instance, not your Windows machine.

Some steps create paid resources (marked **Paid**). Replace `<placeholders>` with your values.

**Your network blocks outbound port 22** (checked 2026-11-07), so SSH won't connect from there. Set up Systems Manager first (step 11) and run these commands in a Session Manager shell. In that case, skip the port 22 rule in step 1.

## 1. Security group

Set these in the AWS console, under EC2 > Security Groups:

| Port | Source | Purpose |
|---|---|---|
| 443 | `0.0.0.0/0` | HTTPS |
| 80 | `0.0.0.0/0` | Let's Encrypt and redirect to HTTPS |
| 22 | Your current IP `/32` only | Temporary. Remove once SSM works (step 11) |

Add no other inbound rules. Never open 3306, 5432, 6379 or 8080.

## 2. Update the system

```bash
sudo apt update && sudo apt full-upgrade -y
```

```bash
sudo apt install -y unattended-upgrades fail2ban ufw
```

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 3. Create a deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
```

```bash
sudo usermod -aG sudo deploy
```

```bash
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

```bash
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
```

```bash
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

This user has no password, so give it passwordless sudo through a dedicated sudoers file, or use a password you set. Confirm you can log in as `deploy` and use `sudo` before step 4.

## 4. SSH key-only access

**Keep your current session open until a new login succeeds.** This step can lock you out.

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
X11Forwarding no
EOF
```

```bash
sudo sshd -t && sudo systemctl reload ssh
```

## 5. Require IMDSv2

This protects instance credentials from server-side request forgery. Run it from a machine with the AWS CLI configured:

```bash
aws ec2 modify-instance-metadata-options --instance-id <instance-id> --http-tokens required --http-endpoint enabled
```

## 6. Firewall

```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
```

```bash
sudo ufw limit OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

```bash
sudo ufw enable
```

**Docker bypasses UFW for published ports.** A `ports:` entry in Compose can expose a service even when UFW appears to block it. So only Nginx may publish ports, and every other service uses private Docker networks. The security group is the outer safeguard.

## 7. Fail2ban

```bash
sudo tee /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
```

```bash
sudo systemctl enable --now fail2ban
```

## 8. Swap

Swap guards against out-of-memory crashes during deploys. It doesn't replace having enough memory.

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
```

```bash
sudo mkswap /swapfile && sudo swapon /swapfile
```

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

```bash
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf && sudo sysctl --system
```

## 9. Docker

Install from Docker's official repository, following the [Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/), then set log limits so logs can't fill the disk:

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
EOF
```

```bash
sudo systemctl restart docker
```

Membership in the `docker` group is effectively root access, so add only the `deploy` user:

```bash
sudo usermod -aG docker deploy
```

## 10. Domain, DNS and HTTPS

1. **Paid.** Allocate an Elastic IP and attach it, so the address survives stops and restarts. AWS charges for public IPv4 addresses.
2. Create a DNS `A` record from `<domain>` to the Elastic IP.
3. Confirm it resolves: `dig +short <domain>`
4. Install Certbot and issue the certificate, serving the challenge from Nginx:

```bash
sudo snap install --classic certbot
```

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d <domain> --agree-tos -m <email> --no-eff-email
```

5. Test renewal:

```bash
sudo certbot renew --dry-run
```

6. Add a deploy hook so renewals reload the Nginx container:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
docker exec nginx nginx -s reload
EOF
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Allow only TLS 1.2 and 1.3. Add HSTS only after HTTPS is confirmed working, because browsers cache it.

**You have no domain yet,** so use an IP-based hostname for `<domain>`, such as `<elastic-ip>.sslip.io`. Let's Encrypt can usually issue for these, subject to rate limits, and no DNS record is needed, so skip steps 2 and 3. A real domain can replace it later.

## 11. Systems Manager access

1. Attach an instance role with the `AmazonSSMManagedInstanceCore` policy.
2. Confirm the instance appears under Systems Manager > Fleet Manager.
3. Confirm you can open a Session Manager shell.
4. Remove the port 22 rule from the security group.

## 12. Backups and storage

- **S3:** enable Block Public Access, default encryption and a lifecycle rule that expires footage.
- **Database:** nightly encrypted `pg_dump` to S3. **Test a restore.** An untested backup can't be relied on.
- **Paid.** Enable EBS volume encryption and scheduled snapshots with Amazon Data Lifecycle Manager.

## 13. Cost and monitoring

- Create an AWS Budget with email alerts, for example at $20, $50 and $100. **Stop GPU instances after every demo.**
- Add a CloudWatch alarm on instance status checks, and watch disk usage.
- **Later:** add an external uptime check against `/healthz`.

## 14. Verify

Run these from a machine outside AWS:

```bash
nmap -Pn <domain>
```

Expect only ports 80 and 443 open (plus 22 until step 11 is done).

```bash
curl -sI https://<domain> | head -5
```

Also confirm that:

- Password SSH login is refused: `ssh -o PubkeyAuthentication=no deploy@<domain>`
- Root SSH login is refused
- `sudo ufw status verbose` and `swapon --show` show the expected settings
- [SSL Labs](https://www.ssllabs.com/ssltest/) grades the site A or better
