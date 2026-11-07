# AWS permissions for the BantayBuhay server

The `bantaybuhay-dev` IAM user can launch servers but can't create the roles, secrets store or
deploy bucket the server setup needs. [`bantaybuhay-dev-policy.json`](bantaybuhay-dev-policy.json)
grants exactly those, limited to resources named `bantaybuhay-*`:

- **Roles:** create the two server roles (`bantaybuhay-ec2-web`, `bantaybuhay-ec2-detector`) and the GitHub deploy role
  (`bantaybuhay-github-deploy`). The only AWS managed policy they can receive is
  `AmazonSSMManagedInstanceCore`, which lets AWS Systems Manager reach the server without SSH.
- **GitHub sign-in:** register GitHub Actions as a sign-in provider, so deploys need no stored AWS keys.
- **Secrets:** read and write parameters under `/bantaybuhay/` in Parameter Store (Singapore).
- **Commands:** run deploy and maintenance commands only on servers tagged `Project=bantaybuhay`.
- **Deploy bucket:** one private S3 bucket, `bantaybuhay-deploy-195170887047`, for release files.

It grants nothing over the PESO server, other people's resources, billing or IAM users.

## Attach it (about 10 minutes, signed in as root)

The policy is longer than the 2,048-character limit for an inline user policy, so it goes in as a
managed policy (limit 6,144):

1. Sign in to the AWS console as root for account 195170887047.
2. Open **IAM > Policies > Create policy**, choose the **JSON** tab, delete the sample and paste the
   whole contents of `bantaybuhay-dev-policy.json`.
3. Click **Next**, name it `BantayBuhayServerSetup`, and click **Create policy**.
4. Open **IAM > Users > bantaybuhay-dev > Add permissions > Add permissions > Attach policies
   directly**, tick `BantayBuhayServerSetup`, and click **Next**, then **Add permissions**.

To check it from the VS Code terminal (prints the parameter list, empty at first):

```bash
aws ssm describe-parameters --region ap-southeast-1
```
