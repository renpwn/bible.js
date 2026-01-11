class BaseQueue {
    constructor(concurrency = 1, name = "Main") {
        this.concurrency = concurrency
        this.name = name

        this.queue = []
        this.processing = 0
        this.completed = 0
        this.failed = 0
        this.total = 0

        this.current = "" // Untuk tracking current lexicon
    }

    add(task) {
        this.total++;
        this.queue.push(task)
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

    async processD() {
        while (this.queue.length > 0 && this.processing < this.maxConcurrent) {
            const {
                task,
                resolve,
                reject
            } = this.queue.shift()
            this.processing++

            task()
                .then(result => {
                    resolve(result)
                    this.completed++
                })
                .catch(error => {
                    reject(error)
                    this.failed++
                    log("❌ Database task ❌", error.message)
                })
                .finally(() => {
                    this.processing--
                    this.showProgress()
                    this.process()
                })
        }
    }

    async processB() {
        const workers = []

        const worker = async () => {
            while (this.queue.length > 0) {
                const task = this.queue.shift()
                if (!task) continue

                this.processing++
                try {
                    const result = await task()
                    this.results.push(result)
                    this.completed++
                } catch (error) {
                    this.failed++
                    log("Task error:", error.message)
                } finally {
                    this.processing--
                    this.showProgress()
                }
            }
        }

        for (let i = 0; i < Math.min(this.concurrency, this.total); i++) {
            workers.push(worker())
        }

        await Promise.all(workers)

        return this.results
    }

    async processL(fetchFn) {
        const workers = []

        const worker = async () => {
            while (this.queue.length > 0) {
                const strongNumber = this.queue.shift()
                if (!strongNumber) continue

                this.processing++
                this.currentLexi = strongNumber; // Set current lexicon
                try {
                    const data = await fetchFn(strongNumber)
                    this.lexiconCache.set(strongNumber, data)
                    this.completed++
                } catch (error) {
                    this.failed++
                    log(`Lexicon error ${strongNumber}:`, error.message)
                } finally {
                    this.processing--
                    this.showProgress()
                }
            }
        }

        for (let i = 0; i < Math.min(this.concurrency, this.total); i++) {
            workers.push(worker())
        }

        await Promise.all(workers)

        return this.lexiconCache
    }

    process0(handler) {
        while (this.queue.length > 0 && this.processing < this.concurrency) {
            const item = this.queue.shift()
            this.processing++

            const isTransactional = typeof item === "object" && item.task
            const taskFn = isTransactional ?
                item.task :
                typeof item === "function" ?
                item :
                () => handler(item)

            this.current = isTransactional ? "DB" : String(item)

            Promise.resolve()
                .then(() => taskFn())
                .then(result => {
                    this.completed++
                    if (isTransactional) item.resolve(result)
                })
                .catch(err => {
                    this.failed++
                    if (isTransactional) item.reject(err)
                    log(`❌ ${this.name} error:`, err.message)
                })
                .finally(() => {
                    this.processing--
                    this.showProgress()
                    this.process(handler)
                })
        }
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
            `${this.current ? "| " + this.current + " " : ""}| ⏳ ${this.processing} | ❌ ${this.failed}`
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
        super(concurrency, "📖 Bible Queue")
        this.results = []
    }
}

class LexiconQueue extends BaseQueue {
    constructor(concurrency = 2) {
        super(concurrency, "📚 Lexicon")
        this.lexiconCache = new Map()
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