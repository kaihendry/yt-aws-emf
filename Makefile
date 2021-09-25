STACK = yt-emf
PROFILE = mine
VERSION = "0.1"

.PHONY: build deploy validate destroy

build:
	sam build

deploy: build
	AWS_PROFILE=$(PROFILE) sam deploy --resolve-s3 --stack-name $(STACK) --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_IAM

validate:
	AWS_PROFILE=$(PROFILE) aws cloudformation validate-template --template-body file://template.yml

destroy:
	AWS_PROFILE=$(PROFILE) aws cloudformation delete-stack --stack-name $(STACK)

local: build
	sam local invoke HelloWorldFunction --event events/event.json

tail:
	AWS_PROFILE=$(PROFILE) sam logs -n HelloWorldFunction --stack-name $(STACK) --tail
