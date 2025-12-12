import { Injectable } from '@nestjs/common';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class FormsService {
  findAll() {
    return { message: 'This action returns all forms' };
  }

  findOne(id: string) {
    return { message: `This action returns form #${id}` };
  }

  create(createFormDto: CreateFormDto) {
    return { message: 'This action adds a new form', data: createFormDto };
  }

  update(id: string, updateFormDto: UpdateFormDto) {
    return { message: `This action updates form #${id}`, data: updateFormDto };
  }

  remove(id: string) {
    return { message: `This action removes form #${id}` };
  }

  createSubmission(formId: string, createSubmissionDto: CreateSubmissionDto) {
    return {
      message: `This action creates a submission for form #${formId}`,
      data: createSubmissionDto,
    };
  }

  getSubmissions(formId: string) {
    return { message: `This action returns submissions for form #${formId}` };
  }
}
