import 'reflect-metadata';
const { AppDataSource } = require('./lib/data-source');
const { LotoTask } = require('./lib/entities/LotoTask');
const { IsolationPoint } = require('./lib/entities/IsolationPoint');

async function check() {
  try {
    const ds = await AppDataSource.initialize();
    const taskRepo = ds.getRepository(LotoTask);
    const pointRepo = ds.getRepository(IsolationPoint);
    const task = await taskRepo.findOne({ 
      order: { createdAt: 'DESC' }, 
      relations: ['creator', 'supervisor'] 
    });
    if (!task) { 
      console.log('{"message": "No tasks found"}'); 
      process.exit(0); 
    }
    const points = await pointRepo.find({ 
      where: { taskId: task.id }, 
      order: { tagNo: 'ASC' } 
    });
    console.log(JSON.stringify({ task, points }, null, 2));
    process.exit(0);
  } catch (e) { 
    console.error(JSON.stringify({ error: e.message })); 
    process.exit(1); 
  }
}
check();
