class BaseQueue {
    constructor(concurrency = 1, name = "Main") {
        this.concurrency = concurrency
        this.name = name

        this.queue = []
        this.processing = 0
        this.completed = 0
        this.failed = 0
        this.total = 0
    }

    add(task) {
        this.total++;
        this.queue.push(task)
        return this
    }

    async addAsync(task) {
        this.total++;
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            })
            this.process()
        })
    }

    async process(handler) {
        const workers = []

        const worker = async () => {
            while (this.queue.length > 0) {
                if (this.processing >= this.concurrency) {
                    await sleep(10)
                    continue
                }

                const item = this.queue.shift()
                if (!item) continue

                this.processing++
                if (typeof item === "string")
                    this.currentLexi = item

                const isDB = typeof item === "object" && item.task
                const isFn = typeof item === "function"

                try {
                    const result = isDB ?
                        await item.task() :
                        isFn ?
                        await item() :
                        await handler(item)

                    this.completed++

                    if (isDB) item.resolve(result)
                    else if (this.results) this.results.push(result)
                    else if (this.lexiconCache) this.lexiconCache.set(item, result)
                } catch (error) {
                    this.failed++
                    if (isDB) item.reject(error)
                    log(`❌ ${this.name} error:`, error.message)
                } finally {
                    this.processing--
                    this.showProgress()
                }
            }
        }

        for (let i = 0; i < this.concurrency; i++) {
            workers.push(worker())
        }

        await Promise.all(workers)

        return this.results || this.lexiconCache
    }

    showProgress() {
        const processed = this.completed + this.failed
        logManager.update(
            this.name,
            processed,
            this.total || 1,
            `${this.currentLexi ? "| " + this.currentLexi + " " : ""}| ⏳ ${this.processing} | ❌ ${this.failed}`
        )
    }
}

class DatabaseQueue extends BaseQueue {
    constructor(db, concurrency = 1) {
        super(concurrency, "📊 DB Queue")
        this.db = db
    }

    async waitUntilEmpty() {
        while (this.queue.length > 0 || this.processing > 0) {
            await sleep(100)
        }
    }
}

class BibleQueue extends BaseQueue {
    constructor(concurrency = 3) {
        super(concurrency, "🌐 Scraping")
        this.results = []
    }
}

class LexiconQueue extends BaseQueue {
    constructor(concurrency = 2) {
        super(concurrency, "📚 Lexicon")
        this.lexiconCache = new Map()
        this.currentLexi = ""
    }

    add(strongNumber) {
        if (!this.lexiconCache.has(strongNumber)) {
            super.add(strongNumber)
            this.lexiconCache.set(strongNumber, null)
        }
    }

    getCache() {
        return this.lexiconCache
    }
}