# Satori Contribution Guidelines

Thank you for reading this guide and we appreciate any contribution.

## Ask a Question

You can use the repository's [Discussions](https://github.com/vercel/satori/discussions) page to ask any questions, post feedback, or share your experience on how you use this library.

## Report a Bug

Whenever you find something which is not working properly, please first search the repository's [Issues](https://github.com/vercel/satori/issues) page and make sure it's not reported by someone else already.

If not, feel free to open an issue with a detailed description of the problem and the expected behavior. A bug reproduction using [Satori’s playground](https://og-playground.vercel.app) will be extremely helpful.

## Request for a New Feature

For new features, it would be great to have some discussions from the community before starting working on it. You can either create an issue (if there isn't one) or post a thread on the [Discussions](https://github.com/vercel/satori/discussions) page to describe the feature that you want to have.

If possible, you can add another additional context like how this feature can be implemented technically, what other alternative solutions we can have, etc.

## Local Development

This project uses [pnpm](https://pnpm.io). To install dependencies, run:

```bash
pnpm install
```

To start the playground together with Satori locally, run:

```bash
pnpm dev:playground
```

And visit localhost:3000.

To only start the development mode of Satori, run `pnpm dev` in the root directory (recommended to test together with the playground to see changes in live).

## Adding Tests

Satori uses [Vitest](https://vitest.dev) to test and generate snapshots. To start and live-watch the tests, run:

```bash
pnpm dev:test
```

It will update snapshot images as well.

You can also use `pnpm test` to only run the test.
