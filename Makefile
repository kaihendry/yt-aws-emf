STACK = yt-emf
PROFILE = mine
VERSION = "0.1"

.PHONY: build deploy validate destroy

deploy: build
	AWS_PROFILE=$(PROFILE) sam deploy --resolve-s3 --stack-name $(STACK) --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_IAM

build:
	sam build

validate:
	AWS_PROFILE=$(PROFILE) sam validate

destroy:
	AWS_PROFILE=$(PROFILE) aws cloudformation delete-stack --stack-name $(STACK)

local: build
	sam local invoke HelloWorldFunction --event events/bad.json

tail:
	AWS_PROFILE=$(PROFILE) sam logs -n HelloWorldFunction --stack-name $(STACK) --tail

test:
	curl -X POST --data @ostechnix.txt https://otxsxqmsc4.execute-api.ap-southeast-1.amazonaws.com/Prod/hello/

fail:
	curl -i -X POST --data @ostechnix.txt https://otxsxqmsc4.execute-api.ap-southeast-1.amazonaws.com/Prod/hello/?code=500
