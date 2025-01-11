const pool = require('../pool')

async function grantVip(id){
    if(!id){
        console.log('fail, no id passed in')
    }

    const query = `
        UPDATE users
        SET membership = 'vip'
        WHERE id = $1
    `

    await pool.query(query, [id])
}

async function writeMessage(id, message){
    const query = `
        INSERT INTO messages("userId", message)
        VALUES($1, $2)
    `

    await pool.query(query, [id, message])
}

async function getMessages(){
    
    const query = `
        SELECT 
            m.id,
            m.message,
            m.createdAt,
            u.username
        FROM messages m
        JOIN users u ON u.id = m."userId"
        ORDER BY createdAt DESC
    `

    const result = await pool.query(query)

    const messages = result.rows.map(row => {
        return {
            ...row,
            createdat: new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(result.rows.createdat)
        }
    })
    return messages
}

async function deleteMessage(id){
    const query = `
        DELETE FROM messages
        WHERE id = $1
    `

    await pool.query(query, [id])
}

module.exports = { grantVip, writeMessage, getMessages, deleteMessage }