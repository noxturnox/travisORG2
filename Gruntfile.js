module.exports = function (grunt) {
    require('dotenv').config()
    grunt.log.header = function () { };
    global.stores = [];
    global.arrayTasksStores = [];
    global.storesAsso = [];
    global.arrayTasksDeploy = [];
    global.changed_theme_files = [];
    global.branchRelease = '';
    function devReleaseLog(error, stdout, stderr, callback){
        global.branchRelease = stdout;
        callback();
    }
    function jslintlog(error, stdout, stderr, callback){
        if(stdout!=''){
            grunt.log.error();
            grunt.log.write(stdout);
        }else{
            grunt.log.ok();
        }
        callback();
    }
    function getLastReleaselog(error, stdout, stderr, callback){
        global.branchRelease = stdout
        callback();
    }
    function handleLastCommitDifferences(error, stdout, stderr, callback) {
        if (stdout.length) {
            global.stores.forEach(store => {
                stdout.split("\n").forEach(f => {
                    if(store == 'common-files' && f.startsWith(`stores/${store}/`)){
                        var commonFiles = grunt.file.readYAML('config.yml');
                        for (storeName in commonFiles[store]){
                            if(commonFiles[store][storeName].includes(f.substring(`stores/common-files/`.length))){
                                var tempStores = [];
                                tempStores = storeName.replace(' ','').split(',');
                                for(i=0;i<tempStores.length;i++){
                                    global.changed_theme_files.push(f.replace('stores/common-files/',`${tempStores[i]}/`)) 
                                }
                            }
                        }
                    }else if (f.startsWith(`stores/${store}/`)) {
                        global.changed_theme_files.push(f.substring((`stores/`).length));
                    }
                })
            })
        }
        if(global.changed_theme_files.length ==0){
            grunt.log.writeln('There are not modified files in any store!'['red'])
            callback (false)
            return false
        }
        callback();
    }
    function theme_deploy_log(error, stdout, stderr, callback){
        if(error != null || stderr != ""){
            grunt.log.error();
            grunt.log.write(('There was a problem with the upload '+stderr)['red'].bold)
            grunt.log.error(error)
            callback(false)
            return false
        }else{
            grunt.log.ok();
            callback()
        }
    }
    function downloadingThemeError(error, stdout, stderr, callback){
        if(error != null || stderr != ""){
            grunt.log.error();
            grunt.log.write(('There was a problem with the download '+stderr)['red'].bold)
            grunt.log.error(error)
            callback(false)
            return false
        }
        callback()
    }
    function exec_comparisonlog(error, stdout, stderr, callback){
        grunt.log.writeln();
        grunt.log.write('Checking if there are any files that were modified in Shopify text editor: '['yellow'].bold)
        if(stdout!=''){
            grunt.log.error();
            grunt.log.write(('There are modified files!:\n'+stdout)['red'].bold)
            callback(false);
            return false;
        }else {
            grunt.log.ok();
            callback();
        }
    }
    function createNewYML(results) {
        var yaml = grunt.file.read('config.yml')
        grunt.file.write('config.yml', yaml + results['shop.name'] + ':\n    develop:\n        password: \'$' + results['shop.name'] + '_pass' +
            '\'\n        theme_id: \'$' + results['shop.name'] + '_dev' + '\'\n        store: \'$' + results['shop.name'] + '_store_URL' + '\'\n    master:\n        password: \'$' + results['shop.name'] + '_pass' +
            '\'\n        theme_id: \'$' + results['shop.name'] + '_master' + '\'\n        store: \'$' + results['shop.name'] + '_store_URL' + '\'\n')
        return true
    }
    function createFolder(results) {
        grunt.task.run('shell:createFolder:' + results['shop.name'])
    }
    function copyTheme(results) {
        grunt.task.run('shell:copyTheme:' + results['yes.copy'] + ':' + results['shop.name'])
    }
    grunt.initConfig({
        stylelint: {
            options: {
              formatter: 'string',
              ignoreDisables: false,
              failOnError: true,
              outputFile: '',
              reportNeedlessDisables: false,
              syntax: '',
            },
            src: [
                'stores/**/*.{css,less,scss}',
                ]
        },
        prompt: {
            target: {
                options: {
                    questions: [
                        {
                            config: 'shop.name',
                            type: '<input type>',
                            message: 'Name for the shop (only lower-cases):',
                            default: '',
                            validate: function (value) {
                                var letters = /^[a-z-_0-9]+$/
                                if (value.match(letters)) {
                                    return true
                                } else { 
                                    return 'The name is not valid' 
                                  }
                            },
                        },
                        {
                            config: 'theme.todo',
                            type: 'list',
                            message: 'Do you want to copy the theme of another store??',
                            choices: [{ value: 'yes', name: 'Yes' }, { value: 'no', name: 'No' }]
                        },
                        {
                            config: 'yes.copy',
                            type: 'list',
                            message: 'Select the store from which you want to copy the theme',
                            choices: global.stores,

                            when: function (answers) {
                                return answers['theme.todo'] == 'yes'
                            }
                        },
                    ],
                    then: function (results, done) {
                        createNewYML(results)
                        if (results['theme.todo'] == 'yes'){
                            copyTheme(results)
                        }
                        else{
                            createFolder(results)
                        }
                    }
                }
            },
        },
        'json-format': {
            formatter: {
                options: {
                    indent: 4,
                    remove: ['_comment']
                },
                files: [
                    {
                        expand: true,
                        cwd: './',
                        src:  [`./stores/**/*.json`],
                        dest: ''
                    },
                ]
            }
        },
        shell: {
            get_last_commit_differences: {
                command: 'git diff HEAD^ HEAD --name-only',
                options: {
                    stdout: false,
                    callback: handleLastCommitDifferences,
                }
            },
            theme_deploy: {
                command: (files,store) => [
                `cd stores/${store}/`,
                `theme deploy ${files} -n --env=${process.env.TRAVIS_BRANCH}`,
                'cd ../../',
                ].join(' && '),
                options: {
                    stdout: false,
                    callback: theme_deploy_log,
                },
            },
            cpcommonfile: {
                command: (shop,file)=>`cp stores/common-files/${file} stores/${shop}/${file}`,
                options: {
                    stdout: true,
                },
            },
            addandcommit: {
                command: [`git checkout ${process.env.TRAVIS_BRANCH} >/dev/null 2>&1`,'git add .','git commit --allow-empty -m "temporal commit"'].join(' && '),
                options: {
                    stdout: false,
                },
            },
            temporalBranch: { 
                command: devBranch => [`git checkout -b temporal ${devBranch} >/dev/null`,
                `grunt cpCommonFilesToRespectiveStores`].join(' && '),
                options: {
                    stdout: false,
                }
            },
            createShopifyBranch: {
                command: ['git add .','git commit --allow-empty -a -m "temporal"',
                `git checkout ${process.env.TRAVIS_BRANCH} >/dev/null`,
                'git checkout -b shopify >/dev/null 2>&1'].join(' && '),
                options: {
                    stdout: false,
                }
            },
            temporalBranchDeploy: {
                command: [`git checkout ${process.env.TRAVIS_BRANCH}`,'git checkout -b temporalDeploy'].join(' && '),
            },
            prettier: {
                command: store =>  `./node_modules/.bin/prettier --check --write "./stores/${store}/**"`,
                options: {
                    stdout: false,
                },
            },
            downloadingTheme: {
                command: store => [`cd stores/${store}`,`theme download --env=${process.env.TRAVIS_BRANCH}`].join(' && '),
                options: {
                    stdout: false,
                    stderr: false,
                    callback: downloadingThemeError,
                }
            },
            commitShopify: {
                command: ['git add .','git commit --allow-empty -a -m "shopify"'].join(' && '),
                options: {
                    stdout: false,
                }
            },
            exec_comparison: {
                command: storeName=> `git diff --ignore-space-at-eol -b -w --diff-filter=MAC --ignore-blank-lines shopify..temporal -- stores/${storeName}/ ":!*config.yml"`,
                options: {
                    stdout: false,
                    callback: exec_comparisonlog,
                },
            },
            copyTheme: {
                command: function (origen, destino) { return `cp -r stores/${origen} stores/${destino} && cd stores/${destino}/ && theme new --password=${process.env.newpass} --store=${process.env.newstore} --name="${destino}"` },
            },
            createFolder: {
                command: folderName => `cd stores && mkdir ${folderName}`,
            },
            shopify_theme_lint: {
                command: shop => [`echo Checking ${shop} theme files`,
                `./node_modules/.bin/theme-lint "stores/${shop}"`].join(' && '),
                options: {
                    stdout: true,
                },
            },
            getLastRelease: {
                command: [`git checkout ${process.env.TRAVIS_BRANCH} >/dev/null 2>&1`,`git fetch --tags >/dev/null 2>&1`, `git tag | tail -1`].join(' && '),
                options: {
                    callback: getLastReleaselog,
                    stdout: false,
                }
            },
            createTag: {
                command: tagname => [`git checkout ${process.env.TRAVIS_BRANCH}`,`git tag -a ${tagname} -m "Release of version ${tagname}"`].join(' && '),
                options: {
                    stdout: false,
                },
            },
            pushTag: {
                command: tag => `git push "https://noxturnox:${process.env.GITHUBTOKEN}@${process.env.REPO}" ${tag}`,
            },
            cleaning: {
                command: [`git add .`,`git commit --allow-empty -m "cleaning"`,`git checkout ${process.env.TRAVIS_BRANCH}`,
            `rm stores/**/config.yml arrayTasksDeployFile`, `git branch -D temporal`, `git branch -D shopify`].join(' && ')
            },
            jslint: {
                command: './node_modules/.bin/eslint "stores/**/**.js"',
                options: {
                    callback: jslintlog,
                    stdout: false,
                },
            },
            cleanLocal: {
                command: [`git tag | xargs git tag -d`,`git reset --hard HEAD~1`].join(' && '),
                options: {
                    stdout: false,
                },
            },
            devRelease: {
                command: [`git checkout ${process.env.TRAVIS_BRANCH} >/dev/null 2>&1`,`git fetch --tags >/dev/null 2>&1`,`git tag | grep pre | tail -1`].join(' && ' ),
                options: {
                    callback: devReleaseLog,
                    stdout: false,
                }
            },
        }
    })

    grunt.registerTask('default', ['checkstatus','getLastReleaseFromRepo','createYAMLFileOnEachShop','getLastCommitDifferences','js-lint','csslint','compareStoreTheme','deploy','shell:cleaning','pushNewTag']) 
    grunt.registerTask('dev', ['getLastReleaseFromRepo','createYAMLFileOnEachShop','getLastCommitDifferences','js-lint','csslint','compareStoreTheme','shell:cleaning',])
    //,'cpCommonFilesToRespectiveStores'  ,'theme_lint'
    grunt.registerTask('checkstatus',function(){
        if(process.env.TRAVIS==undefined || process.env.TRAVIS=='false'){
            grunt.log.writeln('THIS COMMAND MUST BE ONLY USED IN TRAVIS'['red'].bold)
            return false;
        }
    })
    grunt.registerTask('createYAMLFileOnEachShop', function () {
        var result
        grunt.log.writeln();
        grunt.log.write('Checking the existence of root file config.yml '['yellow'].bold)
        if (grunt.file.exists('config.yml')) {
            var shopsArray = grunt.file.readYAML('config.yml')
            grunt.log.ok();
            grunt.log.writeln();
        } else {
            grunt.log.error('The file config.yml was not found'['red'])
            grunt.log.writeln();
            return false;
        }
        
        grunt.log.writeln('Checking each shop and creating the config.yml'['yellow'].bold)
        for (const shopName in shopsArray) {
            if(shopName=='common-files') {
                global.stores.push(shopName);
                continue;
            }
            result = ''
            global.stores.push(shopName)
            grunt.log.write('  '+shopName+' FOLDER exists: ')
            if (!grunt.file.exists('./stores/'+shopName)){
                grunt.log.error();
                return false;
            }else {
                grunt.log.ok();
            } 
            grunt.log.write('  Exists '+shopName+' develop and master enviroments: ')
            if (shopsArray[shopName]['develop']&&shopsArray[shopName]['master']){
                grunt.log.ok();
            }
            else {
                grunt.log.error();
                return false;
            }
            grunt.log.write('  Creating config.yml in ' + shopName + ' ')
            for (const entorno in shopsArray[shopName]) {
                if (
                    grunt.file.exists(
                        'stores/' + shopName + '/config.yml'
                    )
                ) {
                    result += grunt.file.read(
                        'stores/' + shopName + '/config.yml'
                    )
                } else {
                    result = ''
                }
                try{
                    grunt.file.write(
                        'stores/' + shopName + '/config.yml',
                        result +
                        '\n' +
                        entorno +
                        ':\n  password: ' +
                        shopsArray[shopName][entorno].password +
                        '\n  theme_id: ' +
                        shopsArray[shopName][entorno].theme_id +
                        '\n  store: ' +
                        shopsArray[shopName][entorno].store
                    )
                } catch(e){
                    grunt.log.error('Could not create config.yml inside the store FOLDER'['red']);
                    grunt.log.write(e);
                    return false;
                }
            }
            grunt.log.ok();  
            grunt.log.writeln('-----------------------------------------------------')
        }
    })
    grunt.loadNpmTasks('grunt-json-format');
    grunt.loadNpmTasks('grunt-shell')
    grunt.loadNpmTasks('grunt-prompt');
    grunt.loadNpmTasks("grunt-then");
    grunt.loadNpmTasks( 'grunt-stylelint' );
    grunt.registerTask('compareStoreTheme', function () {
        global.stores.forEach(store => {
            global.storesAsso[store] = []; 
            global.changed_theme_files.forEach(file => {
                if(file.includes(store) && !file.includes('config.yml')){
                    global.storesAsso[store].push(file.substring((`${store}/`).length));
                }
            })
            if(storesAsso[store].length!=0){
                global.arrayTasksStores.push('tasksForEachStore:'+store)
                global.arrayTasksDeploy.push('arrayTasksDeployForEachStore:'+global.storesAsso[store].join(' ')+':'+store)
                grunt.file.write('arrayTasksDeployFile',global.arrayTasksDeploy)
            }
        })
        grunt.task
        .run("shell:addandcommit").then( ()=>{
            grunt.log.write('Temporal branch: '['yellow'].bold);
            grunt.log.writeln();
        })
        .run('shell:temporalBranch:'+global.branchRelease).then( ()=>{
            grunt.log.write(('  Running PRETTIER: '))
        })
        .run('shell:prettier:**').then( ()=> {
            grunt.log.ok();
            grunt.log.write(('  Running JSON-Format: '));
        })
        .run('json-format:formatter')
        .run('shell:createShopifyBranch')
        .run(global.arrayTasksStores)
    })
    grunt.registerTask('tasksForEachStore', function(storeName){
                grunt.log.writeln()
                grunt.log.writeln((('\t\t\t\tWorking on SHOP: '+storeName).toUpperCase())['green'].bold)
                grunt.log.writeln();
                grunt.log.write('Shopify branch: '['yellow'].bold);
                grunt.log.writeln();
                grunt.log.write('  Downloading Theme: ')
                grunt.task
            .run('shell:downloadingTheme:'+storeName).then(()=>{
                grunt.log.ok();
                grunt.log.write('  Running PRETTIER: ')
            })
            .run('shell:prettier:'+storeName).then(()=>{
                grunt.log.ok();
                grunt.log.write('  Running JSON-Format: ')
            })
            .run('json-format:formatter')
            .run('shell:commitShopify')
            .run('shell:exec_comparison:'+storeName)
            
    })
    grunt.registerTask('prettier',function(){
        var tempStoresNames = grunt.file.readYAML('config.yml');
        var arrayTasksPrettier = [];
        grunt.log.writeln();
        grunt.log.write('Running prettier on all stores: '['yellow'].bold);
        for (storesNames in tempStoresNames){
            if(storesNames=='common-files'){
                continue;
            }else {
                arrayTasksPrettier.push('shell:prettier:'+storesNames)
            } 
        }
        grunt.task.run(arrayTasksPrettier).then(()=>{
            grunt.log.ok()
        })
    })
    grunt.registerTask('js-lint',function(){
        grunt.log.writeln();
        grunt.log.write('Running js-lint on all Stores: '['yellow'].bold);
        grunt.task.run('shell:jslint');
    })
    grunt.registerTask('csslint', function(){
        grunt.log.writeln();
        grunt.log.write('Checking css files '['yellow'].bold);
        grunt.task.run('stylelint');
    })
    grunt.registerTask('theme_lint', function () {
        grunt.log.writeln();
        grunt.log.writeln(('Running theme-lint on themes')['yellow'].bold)
        grunt.log.writeln()
    })
    grunt.registerTask('deploy', function () {
        var arrayTemp = grunt.file.read('arrayTasksDeployFile');
        var arrayTasks = arrayTemp.split(',');
        grunt.task.run('shell:temporalBranchDeploy')
        grunt.task.run('cpCommonFilesToRespectiveStores')
        grunt.task.run(arrayTasks);
    })
    grunt.registerTask('arrayTasksDeployForEachStore', function(files,store){
        grunt.log.writeln();
        grunt.log.writeln("Files: "+files)
        grunt.log.write((('Uploading theme to '+store+' ')['yellow'].bold))
        grunt.task.run('shell:theme_deploy:'+files+':'+store)
    })
    grunt.registerTask('createShop', function () {
        var yml = grunt.file.readYAML('config.yml')
        for (const storeName in yml){
            if(storeName=='common-files') {
                continue;
            }
            global.stores.push(storeName);
        }
        grunt.log.subhead('Creating a new Store')
        grunt.task.run('prompt:target')
    })
    grunt.registerTask('getLastCommitDifferences', 'shell:get_last_commit_differences')
    grunt.registerTask('getLastReleaseFromRepo',function(){
        if(process.env.TRAVIS_BRANCH == 'develop'){
            grunt.task.run('shell:devRelease')
        }else {
            grunt.task.run('shell:getLastRelease')
        }
        
    })
    grunt.registerTask('pushNewTag',function(){
        grunt.log.write(('Last Release: '+global.branchRelease)['magenta'].bold)
        newRelease = '';
        let tempnumber = 0;
        if(global.branchRelease.startsWith('pre')){
            tempnumber = parseInt(global.branchRelease.substring('/[0-9]+$/'.length));
        }else{
            tempnumber = parseInt(global.branchRelease.substring('/\..*/'.length));
        }
        grunt.log.writeln(('Last digit: '+tempnumber)['magenta'].bold)
        tempnumber += 1; 
        grunt.log.writeln(('Last digit +1: '+tempnumber)['magenta'].bold)
        newRelease = global.branchRelease.substring(0,global.branchRelease.lastIndexOf('.')+1)+tempnumber
        grunt.log.writeln(('New Release: '+newRelease)['magenta'].bold)
        grunt.task.run('shell:createTag:'+newRelease)
        .run('shell:pushTag:'+newRelease)
    })
    grunt.registerTask('cpCommonFilesToRespectiveStores',function(){
        var tempYAML = grunt.file.readYAML('config.yml');
        var arrayTaskscpcommonFiles = [];
        for (storesNames in tempYAML['common-files']){
            arrayFiles = tempYAML['common-files'][storesNames]
            arrayFiles.forEach(file =>{
                arrayStoresNames = storesNames.replace(' ','').split(',');
                arrayStoresNames.forEach(storeName =>{
                    arrayTaskscpcommonFiles.push('shell:cpcommonfile:'+storeName+':'+file)
                })
            })
            grunt.task.run(arrayTaskscpcommonFiles)
        }
    })
}
