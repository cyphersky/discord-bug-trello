const Discord = require('discord.js');
const Trello = require("trello");
const mongoose = require("mongoose");
const BugScheme = require("./models/bug");
mongoose.connect("mongodb://localhost/mhbugs", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const {prefix, botToken, bugReportsTrelloID, applicationKey, userToken} = require("./config.json");
const client = new Discord.Client();
const trello = new Trello(applicationKey, userToken);
var embed = new Discord.MessageEmbed()

var BugsChannel = "ID" // ID канала в который будут отправляться баги
var ApprovoredRoleID = 'ID' // ID Роли которая имеет доступ к командам


client.on('ready', () => {
  console.log('MH Bugs loaded!');
});

client.on('error', (_) => {
    console.log(_);
})


client.on('message', async (message, member, channel) => {

  if (!message.content.startsWith(prefix) || message.author.bot) return;
  var args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  args = args.join(" ");
  let perms = message.member.permissions;

  if (command === 'accept') {
    const user = await message.guild.members.cache.get(message.author.id)
    if (!user.roles.cache.get(ApprovoredRoleID)) return message.reply('Доступно только охотникам за багами')
    if (!args[0]) return message.reply('Укажите Bug-ID')
    var SelectBug = await BugScheme.findOne({ id: args[0] });
    if (!SelectBug) return message.reply('Я не могу найти идентификатор отчета.')
    if (SelectBug.reportStatus != 'none') return message.reply('Этот отчет уже перемещен.')
    var bug = client.channels.cache.get(BugsChannel)
    bug.messages.fetch({around: SelectBug.messageid, limit: 1})
      .then(msg => {
        const fetchedMsg = msg.first();
        fetchedMsg.edit(`**───────────────────**\n<@${SelectBug.owner}> сообщил\n\n**Название:** ${SelectBug.title}\n**Описание:** ${SelectBug.description}\n\nПроверил ${message.author} <:yes:831120978649415751>\nID отчета: **${SelectBug.id}**`);
    });
    SelectBug.reportStatus = 'accept'
    SelectBug.save()

    trello.addCard(SelectBug.title, SelectBug.description, bugReportsTrelloID, function(error, card) {
      console.log('send to trello')
    });

    let tosender = new Discord.MessageEmbed()
    .setDescription(`Приветствую <@${SelectBug.owner}>, статус вашего баг-репорта **#${SelectBug.id}** был изменен на **Одобрен и передан разработчикам**\nОтчет проверил <@${message.author.id}>`)
    .setColor("#7799fb")
    .setTimestamp()

    client.users.cache.get(SelectBug.owner).send(tosender);

    message.delete();

  }

  if (command === 'deny') {

    const user = await message.guild.members.cache.get(message.author.id)
    if (!user.roles.cache.get(ApprovoredRoleID)) return message.reply('Доступно только охотникам за багами')
    if (!args[0]) return message.reply('Укажите Bug-ID')
    var SelectBug = await BugScheme.findOne({ id: args[0] });
    if (!SelectBug) return message.reply('Я не могу найти идентификатор отчета.')
    if (SelectBug.reportStatus != 'none') return message.reply('Этот отчет уже перемещен.')
    var bug = client.channels.cache.get(BugsChannel)
    bug.messages.fetch({around: SelectBug.messageid, limit: 1})
      .then(msg => {
        const fetchedMsg = msg.first();
        fetchedMsg.edit(`**───────────────────**\n<@${SelectBug.owner}> сообщил\n\n**Название:** ${SelectBug.title}\n**Описание:** ${SelectBug.description}\n\nПроверил ${message.author} <:no:831120978289360936>\nID отчета: **${SelectBug.id}**`);
    });
    SelectBug.reportStatus = 'deny'
    SelectBug.save()

    let tosender = new Discord.MessageEmbed()
    .setDescription(`Приветствую <@${SelectBug.owner}>, статус вашего баг-репорта **#${SelectBug.id}** был изменен на **Отказан**\nОтчет проверил <@${message.author.id}>`)
    .setColor("#7799fb")
    .setTimestamp()

    client.users.cache.get(SelectBug.owner).send(tosender);

    message.delete();
  }

  if (command === 'bug' && message.channel.name == "🦋┊команды-боту") {
      message.delete();
      message.reply('**Название бага?**')
      const collector = message.channel.createMessageCollector(
        m => m.author.id === message.author.id,
        {
          time: 120000 // 2 минуты
        }
      );
      var step = 0
      var bugtitle = ""
      var bugdesc = ""
      var mgid = 0
      collector.on("collect", async msg => {
        if (step == 0) {
          bugtitle = msg.content
          message.reply('**Описание бага?**')
          step++
        } else if (step == 1) {
          bugdesc = msg.content
          var ReportCount = await BugScheme.countDocuments() + 1
          client.channels.cache.get(BugsChannel).send(`**───────────────────**\n${message.author} сообщил\n\n**Название:** ${bugtitle}\n**Описание:** ${bugdesc}\n\nВышеуказанный отчет должен быть утвержден.\nID отчета: **${ReportCount}**`).then(async value => {
            var Report = await BugScheme.findOne({ id: ReportCount });
            if (!Report) {
              const newReport = new BugScheme({
              id: ReportCount,
              title: bugtitle,
              description: bugdesc,
              owner: message.author.id,
              messageid: value.id,
            });
            await newReport.save().catch(()=>{});
            }

          })

          message.reply(`Ваш баг был добавлен в очередь на утверждение! Вы будете уведомлены, когда статус вашего отчета будет обновлен, вам нужно просто сидеть сложа руки и ждать, пока Охотники за багами сделают свою магию!`)
          return collector.stop();
        }
        
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          return message.reply('Время ожидание вышло')
        }
      });
    }
});

client.login(botToken);
