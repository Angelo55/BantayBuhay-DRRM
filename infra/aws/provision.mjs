// Creates BantayBuhay's AWS resources in Singapore. Safe to run again: anything that exists is kept.
//
//   node infra/aws/provision.mjs
//
// Needs the BantayBuhayServerSetup policy on bantaybuhay-dev (see README.md here). Costs: the web
// server (t3.medium, about US$0.053 an hour) runs all the time; the detector server (c7i.xlarge,
// about US$0.206 an hour) is stopped right after its first-boot setup and started only when needed.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REGION = "ap-southeast-1";
const ACCOUNT = "195170887047";
const BUCKET = `bantaybuhay-deploy-${ACCOUNT}`;
// GitHub signs this repository's tokens with immutable IDs (owner@id/repo@id), so a renamed or
// re-created repository with the same name can't match.
const REPO = "Angelo55@132664523/BantayBuhay-DRRM@1449058451";
const OIDC = "token.actions.githubusercontent.com";
const AWS = process.platform === "win32" && existsSync("C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe")
  ? "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"
  : "aws";
const TAGS = [{ Key: "Project", Value: "bantaybuhay" }];

function aws(args, { allowFail = false } = {}) {
  const result = spawnSync(AWS, [...args, "--region", REGION, "--output", "json"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    if (allowFail) return null;
    throw new Error(`aws ${args.slice(0, 2).join(" ")} failed: ${result.stderr.trim().split("\n").pop()}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}
const json = (value) => JSON.stringify(value);
const step = (text) => console.log(`\n> ${text}`);

// --- Deploy bucket: private, encrypted, old releases removed after 30 days.
step(`Deploy bucket ${BUCKET}`);
if (aws(["s3api", "head-bucket", "--bucket", BUCKET], { allowFail: true })) {
  console.log("exists");
} else {
  aws(["s3api", "create-bucket", "--bucket", BUCKET, "--create-bucket-configuration", `LocationConstraint=${REGION}`]);
  console.log("created");
}
aws(["s3api", "put-public-access-block", "--bucket", BUCKET, "--public-access-block-configuration",
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"]);
aws(["s3api", "put-bucket-encryption", "--bucket", BUCKET, "--server-side-encryption-configuration",
  json({ Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }] })]);
aws(["s3api", "put-bucket-lifecycle-configuration", "--bucket", BUCKET, "--lifecycle-configuration",
  json({ Rules: [{ ID: "expire-releases", Status: "Enabled", Filter: { Prefix: "releases/" }, Expiration: { Days: 30 } }] })]);
aws(["s3api", "put-bucket-tagging", "--bucket", BUCKET, "--tagging", json({ TagSet: TAGS })]);

// --- GitHub Actions as a sign-in provider, so deploys need no stored AWS keys.
step("GitHub sign-in provider");
const providers = aws(["iam", "list-open-id-connect-providers"]).OpenIDConnectProviderList ?? [];
if (providers.some((item) => item.Arn.endsWith(`/${OIDC}`))) {
  console.log("exists");
} else {
  aws(["iam", "create-open-id-connect-provider", "--url", `https://${OIDC}`, "--client-id-list", "sts.amazonaws.com",
    "--thumbprint-list", "6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd", "--tags", json(TAGS)]);
  console.log("created");
}

// --- Roles.
function role(name, trust, inline, { managed = [] } = {}) {
  step(`Role ${name}`);
  if (aws(["iam", "get-role", "--role-name", name], { allowFail: true })) {
    aws(["iam", "update-assume-role-policy", "--role-name", name, "--policy-document", json(trust)]);
    console.log("exists, trust updated");
  } else {
    aws(["iam", "create-role", "--role-name", name, "--assume-role-policy-document", json(trust), "--tags", json(TAGS)]);
    console.log("created");
  }
  aws(["iam", "put-role-policy", "--role-name", name, "--policy-name", "bantaybuhay", "--policy-document", json(inline)]);
  for (const arn of managed) aws(["iam", "attach-role-policy", "--role-name", name, "--policy-arn", arn]);
}
const policy = (...Statement) => ({ Version: "2012-10-17", Statement });
const parameterArns = (...paths) =>
  paths.flatMap((path) => [`arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${path}`, `arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${path}/*`]);
const ec2Trust = policy({ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" });
const readRelease = { Effect: "Allow", Action: "s3:GetObject", Resource: `arn:aws:s3:::${BUCKET}/releases/*` };
const ssmCore = ["arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"];

// The web server reads the API's secrets and the shared detector token; the detector, only the token.
role("bantaybuhay-ec2-web", ec2Trust, policy(readRelease,
  { Effect: "Allow", Action: ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"], Resource: parameterArns("/bantaybuhay/api", "/bantaybuhay/shared") },
), { managed: ssmCore });
role("bantaybuhay-ec2-detector", ec2Trust, policy(readRelease,
  { Effect: "Allow", Action: ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"], Resource: parameterArns("/bantaybuhay/shared") },
), { managed: ssmCore });

// GitHub may sign in only from this repository's production environment (the deploy and
// operations workflows), and only upload releases, run commands on BantayBuhay servers, and
// start or stop the detector server.
role("bantaybuhay-github-deploy", policy({
  Effect: "Allow",
  Principal: { Federated: `arn:aws:iam::${ACCOUNT}:oidc-provider/${OIDC}` },
  Action: "sts:AssumeRoleWithWebIdentity",
  Condition: { StringEquals: { [`${OIDC}:aud`]: "sts.amazonaws.com", [`${OIDC}:sub`]: `repo:${REPO}:environment:production` } },
}), policy(
  { Effect: "Allow", Action: "s3:PutObject", Resource: `arn:aws:s3:::${BUCKET}/releases/*` },
  { Effect: "Allow", Action: "ssm:SendCommand", Resource: `arn:aws:ec2:${REGION}:${ACCOUNT}:instance/*`, Condition: { StringEquals: { "ssm:resourceTag/Project": "bantaybuhay" } } },
  { Effect: "Allow", Action: "ssm:SendCommand", Resource: `arn:aws:ssm:${REGION}::document/AWS-RunShellScript` },
  { Effect: "Allow", Action: ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations", "ec2:DescribeInstances"], Resource: "*" },
  { Effect: "Allow", Action: ["ec2:StartInstances", "ec2:StopInstances"], Resource: `arn:aws:ec2:${REGION}:${ACCOUNT}:instance/*`, Condition: { StringEquals: { "ec2:ResourceTag/Project": "bantaybuhay", "ec2:ResourceTag/Role": "detector" } } },
  { Effect: "Allow", Action: "ssm:GetParameter", Resource: parameterArns("/bantaybuhay/site") },
));

for (const name of ["bantaybuhay-ec2-web", "bantaybuhay-ec2-detector"]) {
  if (!aws(["iam", "get-instance-profile", "--instance-profile-name", name], { allowFail: true })) {
    aws(["iam", "create-instance-profile", "--instance-profile-name", name, "--tags", json(TAGS)]);
    aws(["iam", "add-role-to-instance-profile", "--instance-profile-name", name, "--role-name", name]);
  }
}

// --- Firewall rules in the default network.
step("Security groups");
const vpc = aws(["ec2", "describe-vpcs", "--filters", "Name=isDefault,Values=true"]).Vpcs[0].VpcId;
function group(name, description) {
  const found = aws(["ec2", "describe-security-groups", "--filters", `Name=group-name,Values=${name}`, `Name=vpc-id,Values=${vpc}`]).SecurityGroups[0];
  if (found) return found.GroupId;
  return aws(["ec2", "create-security-group", "--group-name", name, "--description", description, "--vpc-id", vpc,
    "--tag-specifications", json([{ ResourceType: "security-group", Tags: [...TAGS, { Key: "Name", Value: name }] }])]).GroupId;
}
const webGroup = group("bantaybuhay-web", "BantayBuhay web server: HTTP and HTTPS from anywhere, API from the detector");
const detectorGroup = group("bantaybuhay-detector", "BantayBuhay detector server: no inbound access");
const allow = (groupId, permission) =>
  aws(["ec2", "authorize-security-group-ingress", "--group-id", groupId, "--ip-permissions", json([permission])], { allowFail: true });
for (const port of [80, 443]) {
  allow(webGroup, { IpProtocol: "tcp", FromPort: port, ToPort: port, IpRanges: [{ CidrIp: "0.0.0.0/0" }], Ipv6Ranges: [{ CidrIpv6: "::/0" }] });
}
allow(webGroup, { IpProtocol: "tcp", FromPort: 3000, ToPort: 3000, UserIdGroupPairs: [{ GroupId: detectorGroup, Description: "Detector to API" }] });
console.log(`web ${webGroup}, detector ${detectorGroup}`);

// --- The web server's fixed public address and its sslip.io name.
step("Public address");
let address = aws(["ec2", "describe-addresses", "--filters", "Name=tag:Project,Values=bantaybuhay"]).Addresses[0];
if (!address) {
  address = aws(["ec2", "allocate-address", "--domain", "vpc", "--tag-specifications",
    json([{ ResourceType: "elastic-ip", Tags: [...TAGS, { Key: "Name", Value: "bantaybuhay-web" }] }])]);
}
const serverName = `${address.PublicIp.replaceAll(".", "-")}.sslip.io`;
aws(["ssm", "put-parameter", "--name", "/bantaybuhay/site/SERVER_NAME", "--type", "String", "--value", serverName, "--overwrite"]);
console.log(`${address.PublicIp}, ${serverName}`);

// --- Servers.
const image = aws(["ec2", "describe-images", "--owners", "099720109477", "--filters",
  "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*", "Name=state,Values=available",
  "--query", "sort_by(Images,&CreationDate)[-1].ImageId"]);
const bootstrap = readFileSync(join(ROOT, "infra", "server", "bootstrap.sh"), "utf8");

function server(roleName, type, header, groupId) {
  const existing = aws(["ec2", "describe-instances", "--filters", "Name=tag:Project,Values=bantaybuhay", `Name=tag:Role,Values=${roleName}`,
    "Name=instance-state-name,Values=pending,running,stopping,stopped"]).Reservations.flatMap((item) => item.Instances)[0];
  if (existing) {
    console.log(`${roleName} server exists: ${existing.InstanceId} (${existing.State.Name})`);
    return existing;
  }
  const userData = bootstrap.replace("set -euo pipefail\n", `set -euo pipefail\n${header}\n`);
  // A new instance profile takes a few seconds to become usable; retry only that error.
  const launch = (args) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return aws(args);
      } catch (error) {
        if (attempt >= 8 || !/instance profile/i.test(String(error))) throw error;
        console.log("waiting for the new server role to become usable...");
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000);
      }
    }
  };
  const launched = launch(["ec2", "run-instances", "--image-id", image, "--instance-type", type, "--count", "1",
    "--iam-instance-profile", `Name=bantaybuhay-ec2-${roleName}`, "--security-group-ids", groupId,
    "--metadata-options", "HttpTokens=required,HttpEndpoint=enabled",
    "--block-device-mappings", json([{ DeviceName: "/dev/sda1", Ebs: { VolumeSize: 20, VolumeType: "gp3", Encrypted: true, DeleteOnTermination: true } }]),
    "--user-data", userData,
    "--tag-specifications", json([
      { ResourceType: "instance", Tags: [...TAGS, { Key: "Role", Value: roleName }, { Key: "Name", Value: `bantaybuhay-${roleName}` }] },
      { ResourceType: "volume", Tags: [...TAGS, { Key: "Name", Value: `bantaybuhay-${roleName}` }] },
    ])]).Instances[0];
  console.log(`${roleName} server launched: ${launched.InstanceId} (${type})`);
  aws(["ec2", "wait", "instance-running", "--instance-ids", launched.InstanceId]);
  return aws(["ec2", "describe-instances", "--instance-ids", launched.InstanceId]).Reservations[0].Instances[0];
}

step("Web server");
const web = server("web", "t3.medium", `ROLE=web\nSERVER_NAME=${serverName}`, webGroup);
if (address.InstanceId !== web.InstanceId) {
  aws(["ec2", "associate-address", "--allocation-id", address.AllocationId, "--instance-id", web.InstanceId]);
  console.log("public address attached");
}

step("Detector server");
const detector = server("detector", "c7i.xlarge", `ROLE=detector\nAPI_URL=http://${web.PrivateIpAddress}:3000`, detectorGroup);

console.log(`
Done.
- Site (after the first deploy): http://${serverName}
- Web server: ${web.InstanceId}
- Detector server: ${detector.InstanceId}. It's running its first-boot setup (about 5 minutes);
  stop it afterwards with Actions > Server operations > stop-detector, or it costs about US$0.21 an hour.`);
