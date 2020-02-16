git checkout master
git branch -D %1
git fetch origin pull/%1/head:%1
git checkout %1
call npm install
call npm run build
start "" "http://localhost:8080/"
npm run server