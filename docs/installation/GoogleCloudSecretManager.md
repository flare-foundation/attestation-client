# Google Cloud Secret Manager

Google Cloud Secret Manager is a secure and centralized storage service for API keys, passwords, certificates, and other sensitive data. It is a preferred option for credentials security because it offers several strengths over plain passwords.

Firstly, Google Cloud Secret Manager uses encryption to protect sensitive data at rest and in transit. This means that even if someone gains access to the stored data, they will not be able to read it without the appropriate encryption keys. This provides an additional layer of security beyond just relying on a password.

Secondly, Google Cloud Secret Manager provides access control features that allow you to control who can access specific secrets. This means that you can grant access to individual users or groups of users and revoke access if necessary. With plain passwords, it can be challenging to control who has access to them, as they are often shared and stored in unsecured locations.

Thirdly, Google Cloud Secret Manager provides auditing and monitoring capabilities that allow you to track who has accessed a secret and when. This makes it easier to detect and respond to any unauthorized access attempts.

Overall, Google Cloud Secret Manager is a preferred option for credentials security because it offers strong encryption, access control, and monitoring features that provide greater protection for sensitive data than plain passwords.

## Installation instructions

If you're interested in learning more about Google Cloud Secret Manager, you can find full instructions on the Google Cloud documentation website at the following link:
https://cloud.google.com/sdk/docs/install#deb


This documentation includes detailed information on how to set up and use Secret Manager, including creating and managing secrets, configuring access control, and integrating Secret Manager with other Google Cloud services.

In terms of installation, here is a sample snippet from that documentation that will help you get started:

```
sudo apt-get install apt-transport-https ca-certificates gnupg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-cli
```

Init gcloud
```
gcloud init
```

Enable gcloud for application
```
gcloud auth application-default login
```

Administrative console for Google Cloud Secret Manager can be found here:
https://console.cloud.google.com/security/secret-manager



## Usage

When you create a secret in Google Cloud Secret Manager, it is identified by a unique name that follows a specific format. The format for Secret Manager keys is:

`GoogleCloudSecretManager:projects/[PROJECT-ID]/secrets/[SECRET-NAME]/versions/[VERSION]`

Here's a breakdown of what each part of the key represents:
- `GoogleCloudSecretManager` is a prefix that identifies the key as a Secret Manager key.
- [PROJECT-ID] is the ID of the Google Cloud project that the secret belongs to.
- [SECRET-NAME] is the name of the secret.
- [VERSION] is the version number of the secret. If you don't specify a version number, Secret Manager will use the latest version by default.

---
For example, if you had a secret named "test1" in a project with ID "78436238764782", and you wanted to retrieve the latest version of the secret, the key would be:

`GoogleCloudSecretManager:projects/78436238764782/secrets/test1/versions/latest`

It's important to note that Secret Manager keys are case-sensitive and must be formatted exactly as shown above in order for Secret Manager to recognize and retrieve the secret.
