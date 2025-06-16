pushd lambda;
zip function.zip updateElo.js eloUtils.js node_modules -r;
aws lambda create-function \
  --function-name UpdateElo \
  --handler updateElo.handler \
  --runtime nodejs20.x \
  --role arn:aws:iam::295909865373:role/PriotizationAppLambdaRole \
  --zip-file fileb://function.zip;
popd;
