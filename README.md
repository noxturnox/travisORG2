# Repo Title
A Shopify oriented multi-store automated system that simplifies store's files updating process.

## Features
> - Modify and upload different Shopify's store themes to each store at once.
> - Automatized file linting/syntax checking before any update.
> - Comparisons with current online store theme version for conflict avoidance.
> - Constant visual informative logs of the updating, possible errors and deployment.

## Prerequisites
1. Install [Node.js](https://nodejs.org/en/) and npm which is included once you install Node.js.
2. Download and install [Git](https://git-scm.com/downloads).
3. A [GitHub](https://github.com/)  account.
4. Push permissions to the general repository where the stores' themes are placed.
5. Install [Shopify Theme KIt](https://shopify.github.io/themekit/#installation).

## Getting Started
First of all, move to the folder where you want to work vía command line:
```
cd /path/to/your/directory
```
Once you are there, clone the repository using Git:
```
git clone https://github.com/noxturnox/travisORG
```
Now you need to move inside the cloned repository:
```
cd travisORG/
```
Create a new Git branch with the name of the environment where you will be working on (develop, production, other):
```
git checkout -b your_environment
```
At this point you are supposed to make any kind of modification or update to your code or files in each store.

Once your work is done and ready to upload all those changes, you'll need to perform the following commands:
```
git add .
git commit -m "most-useful-description-possible-of-changes-made"
```
Now your work is ready to be uploaded and start the automated build. Use the next command:
```
git push origin your_environment
```
This will trigger our Travis CI build at the repository which means that your previous work at every single store will be linted, "prettied", compared and error tested via some Grunt tasks at Travis virtual machine where anyone with access to the repository can see the process and logs live at Travis website.

## Working locally with any Shopify theme
This system use [Shopify Theme Kit](https://shopify.github.io/themekit/#installation) for Shopify's themes comparison which can be installed on its own for downloading, uploading or live watch a theme where you are currently working on.

If it's the first time that you will work with a Shopify theme from a specific store in your local machine, you will need to ideally configure a folder like this:

![folder_sample](https://user-images.githubusercontent.com/39498743/56499843-25cb5a00-6500-11e9-90e2-0a708c8ac501.png)

You should only change the name of the "store_name" folder with the actual name of th store where you are currently working.

Once you have this directory tree you will need to add a configuration file for the Shopify Theme Kit. Each store will need a config.yml file inside its own store specific folder. You should be able to generate one using the following command inside the folder with the name of the store:
```
theme configure --password=[your-api-password] --store=[your-store.myshopify.com] --themeid=[your-theme-id]
```
In order to get your **API Password** you should go to the store which you want to work with, go to apps, at the end of the site click on "Manage private apps", click in one of them and just copy the password. Your **Theme ID** just go to the theme that you want to work with and copy the ID which is at the end of the URL. The **Store Name** is another required param which is just the full name of the store plus ".myshopify.com" at the end.

Your folder should now look like this after using the [theme configure command](https://shopify.github.io/themekit/commands/#configure):

![Selección_001](https://user-images.githubusercontent.com/39498743/56503532-9a58c580-650d-11e9-84ad-0654af1720f9.png)

The config.yml file is needed in order to use Shopify Theme Kit at its fullest capacities. Inside the file we can see the following configuration:

```
development:
  password: [your-api-password]
  theme_id: "[your-theme-id]"
  store: [your-store].myshopify.com
```

The configure command generated an [environment](https://shopify.github.io/themekit/commands/#using-environments) with its own configuration which means that we can modify o expand it creating more environments. That is what we take advantage of in this system, automatizing the deploy of updates of files in various themes in as much stores as we want!

Now you should be able to run the following [Theme Kit commands](https://shopify.github.io/themekit/commands/) in the command line once you are in that specific directory.

If you want to download a theme from your store to work with locally:

```
theme download
```
Once you download a theme inside any store folder it should look like this:

![Selección_001](https://user-images.githubusercontent.com/39498743/56567369-43ea9600-65a4-11e9-84b5-d2926ff9c6d5.png)

For viewing live changes made on a Shopify theme and instantly upload them once you save a file:

```
theme watch
```

To upload the changes made to Shopify:

```
theme deploy
```
You can add ``--env=environment_name`` to each command listed above to specify which environment to use or ``-a`` if you want to do it on every environment in the config.yml file.
